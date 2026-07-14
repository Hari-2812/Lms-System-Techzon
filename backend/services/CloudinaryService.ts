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

export const syncCloudinaryFolder = async (folderName: string = 'web-development') => {
  console.log(`Starting Cloudinary sync for folder: ${folderName}`);
  
  // 1. Fetch resources from Cloudinary
  let allResources: any[] = [];
  let nextCursor = undefined;
  
  do {
    const result: any = await cloudinary.api.resources({
      type: 'upload',
      prefix: `${folderName}/`, // Filter by folder
      resource_type: 'video',
      max_results: 500,
      next_cursor: nextCursor,
      context: true,
      tags: true,
    });
    allResources = allResources.concat(result.resources);
    nextCursor = result.next_cursor;
  } while (nextCursor);

  console.log(`Found ${allResources.length} videos in Cloudinary folder: ${folderName}`);

  // 2. Ensure Course exists
  const courseTitle = folderName === 'web-development' ? 'Web Development' : folderName;
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

  // Group videos by some logic or just create a single module if there's no subfolder structure.
  // We'll parse the filename to see if we can guess the module, otherwise put it in "Main Module"
  // Example filename: "HTML Introduction.mp4" -> Module could be "HTML" based on first word?
  // User example: "HTML Introduction.mp4" -> Module: HTML, Lesson: HTML Introduction
  
  for (const resource of allResources) {
    // 3. Sync Video model
    let video = await Video.findOne({ publicId: resource.public_id });
    if (!video) {
      video = await Video.create({
        publicId: resource.public_id,
        secureUrl: resource.secure_url,
        duration: resource.duration || 0,
        folder: resource.folder || folderName,
        courseId: course._id,
      });
    }

    // Determine Module Title
    const filename = resource.public_id.split('/').pop() || '';
    const firstWord = filename.split(' ')[0] || 'General';
    const moduleTitle = firstWord; // Basic heuristic based on user example (HTML, CSS, React)

    // 4. Ensure Module exists
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

    // 5. Ensure Lesson exists
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

  console.log('Cloudinary sync completed successfully.');
  return { success: true, message: `Synced ${allResources.length} videos.` };
};
