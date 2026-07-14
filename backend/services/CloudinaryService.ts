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
  console.log(`--- CLOUDINARY INTEGRATION AUDIT ---`);
  
  // 1. Print the active Cloudinary Cloud Name and API Key prefix.
  const apiKey = process.env.CLOUDINARY_API_KEY || '';
  const maskedApiKey = apiKey.length > 4 ? `${apiKey.substring(0, 4)}***` : 'MISSING';
  
  console.log(`Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
  console.log(`API Key Prefix: ${maskedApiKey}`);
  console.log(`Starting global fetch for all videos without folder filter...`);
  
  let allResources: any[] = [];
  let nextCursor = undefined;
  
  try {
    do {
      // 2. Fetch ALL uploaded video resources without using any folder filter
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

  // 6. If no videos exist, clearly report that
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

  // We will track unique folders detected
  const detectedFolders = new Set<string>();

  for (const resource of allResources) {
    // 3. Log every video's properties
    const resourceFolder = resource.folder || resource.asset_folder || (resource.public_id.includes('/') ? resource.public_id.split('/')[0] : 'Uncategorized');
    detectedFolders.add(resourceFolder);

    console.log(`Video: public_id=${resource.public_id}, folder=${resourceFolder}, secure_url=${resource.secure_url}, resource_type=${resource.resource_type}`);
    
    // 9. Remove duplicates
    if (processedPublicIds.has(resource.public_id)) {
        videosSkipped++;
        continue;
    }
    processedPublicIds.add(resource.public_id);

    // 4 & 5. Dynamically detect folder and use it for Course creation
    const courseTitle = resourceFolder;

    // Ensure Course exists based on the detected folder
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

    // 8. Save every discovered video into MongoDB.
    let video = await Video.findOne({ publicId: resource.public_id });
    if (!video) {
      video = await Video.create({
        publicId: resource.public_id,
        secureUrl: resource.secure_url,
        duration: resource.duration || 0,
        folder: resourceFolder,
        courseId: course._id,
      });
      videosImported++;
    } else {
      video.secureUrl = resource.secure_url;
      video.duration = resource.duration || video.duration;
      video.folder = resourceFolder;
      video.courseId = course._id;
      await video.save();
      videosUpdated++;
    }

    // Determine Module Title from filename
    const filename = resource.public_id.split('/').pop() || '';
    const firstWord = filename.split(' ')[0] || 'General';
    const moduleTitle = firstWord; 

    // Ensure Module exists
    let module = await Module.findOne({ courseId: course._id, title: moduleTitle });
    if (!module) {
      const lastModule = await Module.findOne({ courseId: course._id }).sort({ order: -1 });
      const nextOrder = lastModule ? lastModule.order + 1 : 1;
      module = await Module.create({
        courseId: course._id,
        title: moduleTitle,
        order: nextOrder,
      });
    }

    // Ensure Lesson exists
    const lessonTitle = filename.replace(/_/g, ' ');
    let lesson = await Lesson.findOne({ videoId: video._id });
    if (!lesson) {
      const lastLesson = await Lesson.findOne({ moduleId: module._id }).sort({ order: -1 });
      const nextOrder = lastLesson ? lastLesson.order + 1 : 1;
      lesson = await Lesson.create({
        moduleId: module._id,
        courseId: course._id,
        title: lessonTitle,
        videoId: video._id,
        order: nextOrder,
      });
    }
  }

  // 9. Print Final Summary
  console.log(`\n--- CLOUDINARY SYNC SUMMARY ---`);
  console.log(`Detected Folders: ${Array.from(detectedFolders).join(', ')}`);
  console.log(`Total videos in Cloudinary: ${allResources.length}`);
  console.log(`Videos matched: ${allResources.length}`); // We matched all videos fetched
  console.log(`Videos imported: ${videosImported}`);
  console.log(`Videos updated: ${videosUpdated}`);
  console.log(`Videos skipped (duplicates): ${videosSkipped}`);

  return { 
    success: true, 
    message: `Audit complete. Synced ${allResources.length} videos from folders: ${Array.from(detectedFolders).join(', ')}`,
    stats: { 
      total: allResources.length, 
      imported: videosImported, 
      updated: videosUpdated, 
      skipped: videosSkipped,
      folders: Array.from(detectedFolders)
    }
  };
};
