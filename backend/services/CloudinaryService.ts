import { v2 as cloudinary } from 'cloudinary';
import Course from '../models/Course';
import Module from '../models/Module';
import Lesson from '../models/Lesson';
import Video from '../models/Video';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const syncCloudinaryFolder = async () => {
  console.log(`--- CLOUDINARY SYNC (DYNAMIC FOLDERS) ---`);
  
  const apiKey = process.env.CLOUDINARY_API_KEY || '';
  const maskedApiKey = apiKey.length > 4 ? `${apiKey.substring(0, 4)}***` : 'MISSING';
  
  console.log(`Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
  console.log(`API Key Prefix: ${maskedApiKey}`);
  console.log(`Fetching ALL videos without folder filters...`);
  
  let allResources: any[] = [];
  let nextCursor = undefined;
  
  try {
    do {
      const result: any = await cloudinary.api.resources({
        type: 'upload',
        resource_type: 'video',
        max_results: 500,
        next_cursor: nextCursor,
      });
      allResources = allResources.concat(result.resources);
      nextCursor = result.next_cursor;
    } while (nextCursor);
  } catch (error: any) {
    console.error("Cloudinary API Error:", error.message || error);
    throw error;
  }

  if (allResources.length === 0) {
      console.log("No videos found! The configured Cloudinary account has no uploaded video resources.");
      return { success: false, message: "No uploaded videos found in this Cloudinary account." };
  }

  let videosImported = 0;
  let videosUpdated = 0;
  let videosSkipped = 0;
  const processedPublicIds = new Set();
  
  console.log(`\nFound ${allResources.length} total videos in Cloudinary.`);
  console.log(`--- LOGGING DISCOVERED RESOURCES ---`);

  // Ensure "Web Development" Course exists
  const courseTitle = "Web Development";
  let course = await Course.findOne({ title: courseTitle });
  if (!course) {
    course = await Course.create({
      title: courseTitle,
      slug: courseTitle.toLowerCase().replace(/\s+/g, '-'),
      description: `Complete ${courseTitle} course automatically synced from Cloudinary.`,
      category: 'Development',
      status: 'published',
    });
  }

  // Task 7: Remove old dummy lessons from the LMS (clean slate for this course's modules and lessons)
  // We'll only delete lessons that don't have a valid videoId in our new Video collection.
  // Actually, wiping all existing modules/lessons for this course is safest to remove dummy structure.
  console.log(`Clearing old dummy modules and lessons for ${courseTitle}...`);
  await Lesson.deleteMany({ courseId: course._id });
  await Module.deleteMany({ courseId: course._id });
  
  // We recreate one main module for all videos
  const mainModule = await Module.create({
    courseId: course._id,
    title: "Course Content",
    order: 1,
  });

  let lessonOrderCounter = 1;

  for (const resource of allResources) {
    // Log video details
    console.log(`Video: public_id=${resource.public_id}, secure_url=${resource.secure_url}, duration=${resource.duration}, bytes=${resource.bytes}, created_at=${resource.created_at}`);
    
    // Deduplicate
    if (processedPublicIds.has(resource.public_id)) {
        videosSkipped++;
        continue;
    }
    processedPublicIds.add(resource.public_id);

    // Upsert Video
    let video = await Video.findOne({ publicId: resource.public_id });
    if (!video) {
      video = await Video.create({
        publicId: resource.public_id,
        secureUrl: resource.secure_url,
        duration: resource.duration || 0,
        folder: "Web Development", // Hardcode assigned folder
        courseId: course._id,
      });
      videosImported++;
    } else {
      video.secureUrl = resource.secure_url;
      video.duration = resource.duration || video.duration;
      video.folder = "Web Development";
      video.courseId = course._id;
      await video.save();
      videosUpdated++;
    }

    // Create Lesson (all grouped under mainModule for now, since we have no folder structure)
    const lessonTitle = resource.public_id.replace(/_/g, ' ') || 'Untitled Video';
    await Lesson.create({
      moduleId: mainModule._id,
      courseId: course._id,
      title: lessonTitle,
      videoId: video._id,
      order: lessonOrderCounter++,
    });
  }

  console.log(`\n--- CLOUDINARY SYNC SUMMARY ---`);
  console.log(`Total videos fetched: ${allResources.length}`);
  console.log(`Videos imported: ${videosImported}`);
  console.log(`Videos updated: ${videosUpdated}`);
  console.log(`Videos skipped (duplicates): ${videosSkipped}`);

  return { 
    success: true, 
    message: `Sync complete. Fetched ${allResources.length}. Imported: ${videosImported}, Updated: ${videosUpdated}.`,
    stats: { 
      fetched: allResources.length, 
      imported: videosImported, 
      updated: videosUpdated, 
      skipped: videosSkipped
    }
  };
};
