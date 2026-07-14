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

export const syncCloudinaryFolder = async () => {
  console.log(`\n==========================================`);
  console.log(`Cloudinary Connection Audit`);
  console.log(`==========================================`);
  
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'MISSING';
  const apiKey = process.env.CLOUDINARY_API_KEY || '';
  const maskedApiKey = apiKey.length > 4 ? `${apiKey.substring(0, 4)}***` : 'MISSING';
  
  console.log(`Cloud Name: ${cloudName}`);
  console.log(`API Key Prefix: ${maskedApiKey}`);
  console.log(`SDK Version: ${cloudinary.config().api_version || 'Default'}`);

  let allResources: any[] = [];
  let nextCursor = undefined;
  
  try {
    console.log(`\nAttempting Search API fetch...`);
    // Try Cloudinary Search API first (which returns asset_folder by default in newer environments)
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
    
    if (allResources.length === 0) {
      console.log(`Search API returned 0 resources. Logging raw response if possible.`);
    }

  } catch (error: any) {
    console.error(`Search API failed, falling back to Admin API:`, error.message);
    
    // Fallback to Admin API
    allResources = [];
    nextCursor = undefined;
    
    do {
      const result: any = await cloudinary.api.resources({
        resource_type: 'video',
        type: 'upload',
        max_results: 500,
        next_cursor: nextCursor,
      });
      if (result && result.resources) {
        allResources = allResources.concat(result.resources);
        nextCursor = result.next_cursor;
      } else {
        break;
      }
    } while (nextCursor);
  }

  if (allResources.length === 0) {
      console.log("No uploaded videos found in this Cloudinary account.");
      return { success: false, message: "No uploaded videos found in this Cloudinary account." };
  }

  let videosImported = 0;
  let videosUpdated = 0;
  let videosSkipped = 0;
  let videosDeleted = 0; // if we implement deletion of missing videos later
  const processedPublicIds = new Set();
  
  console.log(`\nTotal resources returned: ${allResources.length}`);
  console.log(`\n--- LOGGING DISCOVERED RESOURCES ---`);

  // Course Mapping Setup
  // Map 'Web Development' videos to 'Full Stack MERN Development'
  const targetCourseTitle = "Full Stack MERN Development";
  let targetCourse = await Course.findOne({ title: targetCourseTitle });
  if (!targetCourse) {
    targetCourse = await Course.create({
      title: targetCourseTitle,
      slug: targetCourseTitle.toLowerCase().replace(/\s+/g, '-'),
      description: `Complete ${targetCourseTitle} course mapped automatically from Cloudinary.`,
      category: 'Development',
      status: 'published',
    });
  }

  // Clear dummy modules and lessons for this course to ensure clean slate
  console.log(`Clearing old dummy modules and lessons for ${targetCourseTitle}...`);
  await Lesson.deleteMany({ courseId: targetCourse._id });
  await Module.deleteMany({ courseId: targetCourse._id });
  
  const mainModule = await Module.create({
    courseId: targetCourse._id,
    title: "Course Content",
    order: 1,
  });

  let lessonOrderCounter = 1;

  for (const resource of allResources) {
    const assetFolder = resource.asset_folder || resource.folder || "Uncategorized";
    
    console.log(`\nPublic ID: ${resource.public_id}`);
    console.log(`Asset Folder: ${assetFolder}`);
    console.log(`Resource Type: ${resource.resource_type}`);
    console.log(`Secure URL: ${resource.secure_url}`);
    console.log(`Format: ${resource.format}`);
    console.log(`Duration: ${resource.duration || 0}`);
    console.log(`Bytes: ${resource.bytes}`);
    console.log(`Created At: ${resource.created_at}`);

    // Skip duplicates
    if (processedPublicIds.has(resource.public_id)) {
        videosSkipped++;
        continue;
    }
    processedPublicIds.add(resource.public_id);

    // Only process videos belonging to "Web Development" folder
    if (assetFolder !== "Web Development") {
      // Not part of the requested mapping
      continue;
    }

    const videoTitle = resource.public_id.split('/').pop()?.replace(/_/g, ' ') || 'Untitled Video';
    
    // Attempt to generate a thumbnail URL (Cloudinary auto-generates .jpg for videos)
    // Replace .mp4 or similar extension with .jpg
    let thumbnailUrl = resource.secure_url;
    if (thumbnailUrl && resource.format) {
      thumbnailUrl = thumbnailUrl.replace(`.${resource.format}`, '.jpg');
      // Adding standard video transformation for thumbnail (e.g. middle of video)
      thumbnailUrl = thumbnailUrl.replace('/upload/', '/upload/so_auto,w_640,h_360,c_fill/');
    }

    // Upsert into MongoDB
    let video = await Video.findOne({ publicId: resource.public_id });
    if (!video) {
      video = await Video.create({
        title: videoTitle,
        publicId: resource.public_id,
        secureUrl: resource.secure_url,
        duration: resource.duration || 0,
        bytes: resource.bytes || 0,
        format: resource.format || '',
        thumbnail: thumbnailUrl,
        assetFolder: assetFolder,
        courseId: targetCourse._id,
      });
      videosImported++;
    } else {
      video.title = videoTitle;
      video.secureUrl = resource.secure_url;
      video.duration = resource.duration || video.duration;
      video.bytes = resource.bytes || video.bytes;
      video.format = resource.format || video.format;
      video.thumbnail = thumbnailUrl;
      video.assetFolder = assetFolder;
      video.courseId = targetCourse._id;
      await video.save();
      videosUpdated++;
    }

    // Assign to Lesson
    await Lesson.create({
      moduleId: mainModule._id,
      courseId: targetCourse._id,
      title: videoTitle,
      videoId: video._id,
      order: lessonOrderCounter++,
    });
  }

  console.log(`\n==========================================`);
  console.log(`Verification Summary`);
  console.log(`==========================================`);
  console.log(`Cloudinary Connected: Yes`);
  console.log(`Cloud Name: ${cloudName}`);
  console.log(`Videos Found: ${allResources.length}`);
  console.log(`Videos Imported: ${videosImported}`);
  console.log(`Videos Updated: ${videosUpdated}`);
  console.log(`Videos Skipped: ${videosSkipped}`);
  console.log(`Videos Deleted: ${videosDeleted}`);
  console.log(`Course Mapping Completed: Yes (Mapped to 'Full Stack MERN Development')`);

  return { 
    success: true, 
    message: `Sync complete. Fetched ${allResources.length}. Imported: ${videosImported}, Updated: ${videosUpdated}.`,
    stats: { 
      fetched: allResources.length, 
      imported: videosImported, 
      updated: videosUpdated, 
      skipped: videosSkipped,
      deleted: videosDeleted
    }
  };
};
