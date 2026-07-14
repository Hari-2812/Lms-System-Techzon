import { v2 as cloudinary } from 'cloudinary';
import Course from '../models/Course';
import Module from '../models/Module';
import Lesson from '../models/Lesson';
import Video from '../models/Video';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const normalizeString = (str: string) => {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
};

const FOLDER_MAPPINGS = [
  { folderKeys: ['webdevelopment'], courseTitle: 'Web Development' },
  { folderKeys: ['fullstackdevelopment'], courseTitle: 'Full Stack Development Course' },
  { folderKeys: ['mernstackdevelopment'], courseTitle: 'MERN Stack Development Course' },
];

export const syncCloudinaryFolder = async () => {
  console.log(`\n==========================================`);
  console.log(`Cloudinary Sync Started (Asset Folder Mode)`);
  console.log(`==========================================`);
  
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'MISSING';
  const apiKey = process.env.CLOUDINARY_API_KEY || '';
  const maskedApiKey = apiKey.length > 4 ? `${apiKey.substring(0, 4)}***` : 'MISSING';
  
  console.log(`Cloud Name: ${cloudName}`);
  console.log(`API Key Prefix: ${maskedApiKey}`);
  console.log(`Fetching ALL uploaded videos...`);

  let allResources: any[] = [];
  let nextCursor = undefined;

  // 1. Fetch ALL videos using Admin API
  try {
    do {
      const result: any = await cloudinary.api.resources({
        resource_type: 'video',
        type: 'upload',
        max_results: 500,
        tags: true,
        context: true,
        next_cursor: nextCursor,
      });
      if (result && result.resources) {
        allResources = allResources.concat(result.resources);
        nextCursor = result.next_cursor;
      } else {
        break;
      }
    } while (nextCursor);
  } catch (error: any) {
    console.error(`Admin API fetch failed:`, error.message);
    console.log(`Falling back to Search API...`);
    
    // 2. Fallback to Search API
    allResources = [];
    nextCursor = undefined;
    try {
      do {
        const searchRequest = cloudinary.search
          .expression("resource_type:video")
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
    } catch (searchError: any) {
      console.error(`Search API fetch also failed:`, searchError.message);
    }
  }

  if (allResources.length === 0) {
    console.log(`\nNo uploaded videos found via either API.`);
    return { 
      success: false, 
      message: "No videos found in Cloudinary account.",
      stats: { foldersFound: 0, fetched: 0, imported: 0, updated: 0, skipped: 0, deleted: 0, lastSync: new Date().toISOString() }
    };
  }

  console.log(`\nVideos Found: ${allResources.length}`);
  
  // Print top 5 resources for debug
  console.log(`\n--- TOP 5 RAW RESOURCES DUMP ---`);
  const top5 = allResources.slice(0, 5);
  top5.forEach((res, idx) => {
    console.log(`\nResource #${idx + 1}:`);
    console.log(JSON.stringify(res, null, 2));
  });
  console.log(`--------------------------------\n`);

  let globalImported = 0;
  let globalUpdated = 0;
  let globalSkipped = 0;
  let globalDeleted = 0;
  const processedPublicIds = new Set();
  const validFoldersFound = new Set<string>();

  // Extract metadata and group by courses based on asset_folder
  for (const mapping of FOLDER_MAPPINGS) {
    console.log(`\nProcessing Folder Mapping: ${mapping.courseTitle}`);
    
    // Filter videos matching the target folder string
    const mappedVideos = allResources.filter(r => {
      const folderRaw = r.asset_folder || r.folder || '';
      if (!folderRaw) return false;
      const normalizedFolder = normalizeString(folderRaw);
      return mapping.folderKeys.includes(normalizedFolder);
    });

    if (mappedVideos.length === 0) {
      console.log(`No videos found for course: ${mapping.courseTitle}`);
      continue;
    }

    validFoldersFound.add(mapping.courseTitle);
    console.log(`Found ${mappedVideos.length} videos for course "${mapping.courseTitle}"`);

    // Ensure Course exists
    let targetCourse = await Course.findOne({ title: mapping.courseTitle });
    if (!targetCourse) {
      targetCourse = await Course.create({
        title: mapping.courseTitle,
        slug: mapping.courseTitle.toLowerCase().replace(/\s+/g, '-'),
        description: `${mapping.courseTitle} automatically synced from Cloudinary folder.`,
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

    // Cleanup Deleted Videos (from DB)
    const existingVideos = await Video.find({ courseId: targetCourse._id });
    const fetchedPublicIds = mappedVideos.map(r => r.public_id);
    
    for (const exVid of existingVideos) {
      if (!fetchedPublicIds.includes(exVid.publicId)) {
        await Video.deleteOne({ _id: exVid._id });
        globalDeleted++;
        console.log(`Deleted missing video from DB: ${exVid.publicId}`);
      }
    }

    let lessonOrderCounter = 1;

    for (const resource of mappedVideos) {
      const displayName = resource.display_name || (resource.context && resource.context.custom && resource.context.custom.caption) || resource.public_id.split('/').pop()?.replace(/_/g, ' ') || 'Untitled Video';
      
      console.log(`\nVideo Name: ${displayName}`);
      console.log(`Public ID: ${resource.public_id}`);
      console.log(`Secure URL: ${resource.secure_url}`);
      
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
        // generate thumbnail using Cloudinary transformation
        thumbnailUrl = thumbnailUrl.replace('/upload/', '/upload/so_auto,w_640,h_360,c_fill/');
      } else if (thumbnailUrl && !resource.format) {
         // fallback if format missing
         thumbnailUrl = thumbnailUrl + ".jpg";
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
    console.log(`\nCourse '${mapping.courseTitle}' Updated`);
  }

  console.log(`\n==========================================`);
  console.log(`Final Verification Summary`);
  console.log(`==========================================`);
  console.log(`Videos Found: ${allResources.length}`);
  console.log(`Folders Mapped: ${validFoldersFound.size}`);
  console.log(`Videos Imported: ${globalImported}`);
  console.log(`Videos Updated: ${globalUpdated}`);
  console.log(`Videos Skipped: ${globalSkipped}`);
  console.log(`Videos Deleted: ${globalDeleted}`);

  return { 
    success: true, 
    message: `Sync complete. Fetched ${allResources.length}.`,
    stats: { 
      foldersFound: validFoldersFound.size,
      fetched: allResources.length, 
      imported: globalImported, 
      updated: globalUpdated, 
      skipped: globalSkipped,
      deleted: globalDeleted,
      lastSync: new Date().toISOString()
    }
  };
};
