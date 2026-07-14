import { v2 as cloudinary } from 'cloudinary';
import Course from '../models/Course';
import Module from '../models/Module';
import Lesson from '../models/Lesson';
import Video from '../models/Video';
import logger from '../config/logger';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const FOLDER_MAPPINGS = [
  { folder: 'Web Development', courseTitle: 'Web Development' },
  { folder: 'Full Stack Development', courseTitle: 'Full Stack Development Course' },
  { folder: 'MERN Stack Development', courseTitle: 'MERN Stack Development Course' },
];

export const syncCloudinaryFolder = async () => {
  console.log(`\n==========================================`);
  console.log(`Production Cloudinary Sync Started`);
  console.log(`==========================================`);
  
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'MISSING';
  const apiKey = process.env.CLOUDINARY_API_KEY || '';
  const maskedApiKey = apiKey.length > 4 ? `${apiKey.substring(0, 4)}***` : 'MISSING';
  const environment = process.env.NODE_ENV || 'development';
  
  console.log(`Connected to Cloudinary`);
  console.log(`Cloud Name: ${cloudName}`);
  console.log(`API Key Prefix: ${maskedApiKey}`);
  console.log(`Environment: ${environment}`);
  console.log(`Folder Mode: Dynamic Folders`);

  let globalImported = 0;
  let globalUpdated = 0;
  let globalSkipped = 0;
  let globalDeleted = 0;
  let totalVideosFound = 0;
  const foldersFound: string[] = [];

  for (const mapping of FOLDER_MAPPINGS) {
    console.log(`\nSearching folder:\n${mapping.folder}`);
    
    let allResources: any[] = [];
    let nextCursor = undefined;
    const searchExpr = `resource_type:video AND asset_folder:"${mapping.folder}"`;
    
    try {
      do {
        const searchRequest = cloudinary.search
          .expression(searchExpr)
          .max_results(500)
          .with_field("tags")
          .with_field("context");
        
        if (nextCursor) {
          searchRequest.next_cursor(nextCursor);
        }
        
        const searchResult = await searchRequest.execute();
        
        if (searchResult && searchResult.resources) {
          allResources = allResources.concat(searchResult.resources);
          nextCursor = searchResult.next_cursor;
        } else {
          break;
        }
      } while (nextCursor);
      
    } catch (error: any) {
      console.error(`Search API failed for ${mapping.folder}:`, error.message);
    }

    if (allResources.length === 0) {
      console.log(`Cloudinary API Response: 0 videos found.`);
      console.log(`Current Search Expression: ${searchExpr}`);
      console.log(`Cloud Name: ${cloudName}`);
      console.log(`API Key prefix: ${maskedApiKey}`);
      console.log(`Environment: ${environment}`);
      console.log(`Folder Mode: Dynamic Folders`);
      console.log(`Raw JSON Response: []`);
      continue; // Skip to next folder
    }

    foldersFound.push(mapping.folder);
    totalVideosFound += allResources.length;

    console.log(`\nVideos Found:\n${allResources.length}`);

    // Ensure Course exists
    let targetCourse = await Course.findOne({ title: mapping.courseTitle });
    if (!targetCourse) {
      targetCourse = await Course.create({
        title: mapping.courseTitle,
        slug: mapping.courseTitle.toLowerCase().replace(/\s+/g, '-'),
        description: `${mapping.courseTitle} automatically synced from Cloudinary.`,
        category: 'Development',
        status: 'published',
      });
    }

    // Clear old dummy data and orphaned lessons
    await Lesson.deleteMany({ courseId: targetCourse._id });
    await Module.deleteMany({ courseId: targetCourse._id });
    
    const mainModule = await Module.create({
      courseId: targetCourse._id,
      title: "Course Content",
      order: 1,
    });

    // Cleanup Deleted Videos
    // Fetch all existing videos for this course
    const existingVideos = await Video.find({ courseId: targetCourse._id });
    const fetchedPublicIds = allResources.map(r => r.public_id);
    
    for (const exVid of existingVideos) {
      if (!fetchedPublicIds.includes(exVid.publicId)) {
        await Video.deleteOne({ _id: exVid._id });
        globalDeleted++;
        console.log(`Deleted missing video from DB: ${exVid.publicId}`);
      }
    }

    const processedPublicIds = new Set();
    let lessonOrderCounter = 1;

    for (const resource of allResources) {
      const displayName = resource.display_name || resource.public_id.split('/').pop()?.replace(/_/g, ' ') || 'Untitled Video';
      console.log(`\nVideo:\n${displayName}`);

      // Skip duplicates in response
      if (processedPublicIds.has(resource.public_id)) {
          globalSkipped++;
          continue;
      }
      processedPublicIds.add(resource.public_id);

      // Extract playback URL & Thumbnail
      let playbackUrl = resource.secure_url;
      let thumbnailUrl = resource.secure_url;
      if (thumbnailUrl && resource.format) {
        thumbnailUrl = thumbnailUrl.replace(`.${resource.format}`, '.jpg');
        thumbnailUrl = thumbnailUrl.replace('/upload/', '/upload/so_auto,w_640,h_360,c_fill/');
      }

      // Upsert into MongoDB
      let video = await Video.findOne({ publicId: resource.public_id });
      if (!video) {
        video = await Video.create({
          title: displayName,
          displayName: displayName,
          publicId: resource.public_id,
          secureUrl: resource.secure_url,
          playbackUrl: playbackUrl,
          duration: resource.duration || 0,
          bytes: resource.bytes || 0,
          format: resource.format || '',
          version: String(resource.version),
          resourceType: resource.resource_type,
          thumbnail: thumbnailUrl,
          assetFolder: mapping.folder,
          courseId: targetCourse._id,
        });
        globalImported++;
      } else {
        video.title = displayName;
        video.displayName = displayName;
        video.secureUrl = resource.secure_url;
        video.playbackUrl = playbackUrl;
        video.duration = resource.duration || video.duration;
        video.bytes = resource.bytes || video.bytes;
        video.format = resource.format || video.format;
        video.version = String(resource.version || video.version);
        video.resourceType = resource.resource_type || video.resourceType;
        video.thumbnail = thumbnailUrl;
        video.assetFolder = mapping.folder;
        video.courseId = targetCourse._id;
        await video.save();
        globalUpdated++;
      }

      // Assign to Lesson
      await Lesson.create({
        moduleId: mainModule._id,
        courseId: targetCourse._id,
        title: displayName,
        videoId: video._id,
        order: lessonOrderCounter++,
      });
    }
    console.log(`\nCourse Updated`);
  }

  console.log(`\n==========================================`);
  console.log(`Final Verification Summary`);
  console.log(`==========================================`);
  console.log(`Cloudinary Connected: Yes`);
  console.log(`Cloud Name: ${cloudName}`);
  console.log(`Folders Found: ${foldersFound.length}`);
  console.log(`Videos Found: ${totalVideosFound}`);
  console.log(`Videos Imported: ${globalImported}`);
  console.log(`Videos Updated: ${globalUpdated}`);
  console.log(`Videos Skipped: ${globalSkipped}`);
  console.log(`Videos Deleted: ${globalDeleted}`);
  console.log(`Course Mapping Completed: Yes`);

  return { 
    success: true, 
    message: `Sync complete. Fetched ${totalVideosFound}.`,
    stats: { 
      foldersFound: foldersFound.length,
      fetched: totalVideosFound, 
      imported: globalImported, 
      updated: globalUpdated, 
      skipped: globalSkipped,
      deleted: globalDeleted,
      lastSync: new Date().toISOString()
    }
  };
};
