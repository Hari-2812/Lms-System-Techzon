import { v2 as cloudinary } from 'cloudinary';
import Course from '../models/Course';
import Module from '../models/Module';
import Lesson from '../models/Lesson';
import Video from '../models/Video';
import SyncStat from '../models/SyncStat';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const normalizeString = (str: string) => {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
};



function titleCase(str: string) {
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.substring(1)).join(' ');
}

export const syncCloudinaryFolder = async () => {
  console.log(`\n==========================================`);
  console.log(`Cloudinary Sync Started (Dynamic Folder Mode)`);
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
      stats: { foldersFound: 0, fetched: 0, imported: 0, updated: 0, skipped: 0, deleted: 0, lastSync: new Date().toISOString(), coursesCreated: 0, courseStats: [] }
    };
  }

  console.log(`\nVideos Found: ${allResources.length}`);

  let globalImported = 0;
  let globalUpdated = 0;
  let globalSkipped = 0;
  let globalDeleted = 0;
  let globalCoursesCreated = 0;
  let globalModulesCreated = 0;
  const processedPublicIds = new Set();
  const validFoldersFound = new Set<string>();
  const courseStats: { courseName: string; count: number }[] = [];

  // Dynamically group videos by their asset_folder (or folder)
  const groupedVideos: Record<string, any[]> = {};

  for (const r of allResources) {
    // Validate required fields
    if (!r.secure_url || !r.public_id) {
      console.log(`Skipped Video - Missing secure_url or public_id. ID: ${r.public_id || 'Unknown'}`);
      globalSkipped++;
      continue;
    }

    const folderRaw = r.asset_folder || r.folder || '';
    if (!folderRaw) {
      console.log(`Skipped Video - Missing folder. ID: ${r.public_id}`);
      globalSkipped++;
      continue;
    }
    
    if (!groupedVideos[folderRaw]) {
      groupedVideos[folderRaw] = [];
    }
    groupedVideos[folderRaw].push(r);
  }

  const folderNames = Object.keys(groupedVideos);

  for (const folderRaw of folderNames) {
    const mappedVideos = groupedVideos[folderRaw];
    
    // Determine the course title purely dynamically based on the folder name
    // Example: "aws-cloud" or "AWS Cloud" -> "Aws Cloud"
    let courseTitle = titleCase(folderRaw.replace(/[-_]/g, ' '));
    if (courseTitle.toLowerCase() === 'aws') courseTitle = 'AWS';
    if (courseTitle.toLowerCase() === 'aws cloud computing') courseTitle = 'AWS Cloud Computing';
    if (courseTitle.toLowerCase() === 'ai & data science') courseTitle = 'AI & Data Science';

    validFoldersFound.add(courseTitle);
    console.log(`\nProcessing Course: ${courseTitle} (Folder: ${folderRaw}) with ${mappedVideos.length} videos`);

    // Ensure Course exists
    let targetCourse = await Course.findOne({ 
      $or: [
        { title: courseTitle },
        { cloudinaryFolder: folderRaw }
      ]
    });

    if (!targetCourse) {
      targetCourse = await Course.create({
        title: courseTitle,
        slug: courseTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        description: `${courseTitle} automatically synced from Cloudinary.`,
        category: 'Tech', 
        status: 'published',
        cloudinaryFolder: folderRaw,
        duration: 0,
        price: 0
      });
      globalCoursesCreated++;
      console.log(`Created new course: ${courseTitle}`);
    } else {
      // Update cloudinaryFolder if it was missing
      if (targetCourse.cloudinaryFolder !== folderRaw) {
        targetCourse.cloudinaryFolder = folderRaw;
        await targetCourse.save();
      }
    }

    // Ensure the main "Course Content" module exists
    let mainModule = await Module.findOne({ courseId: targetCourse._id, title: "Course Content" });
    if (!mainModule) {
      mainModule = await Module.create({
        courseId: targetCourse._id,
        title: "Course Content",
        order: 1,
      });
      globalModulesCreated++;
    }

    // Identify existing DB records for this course to calculate deletions later
    const existingVideos = await Video.find({ courseId: targetCourse._id });
    
    const fetchedPublicIds = mappedVideos.map(r => r.public_id);
    
    // Cleanup Deleted Videos (from DB)
    for (const exVid of existingVideos) {
      if (!fetchedPublicIds.includes(exVid.publicId)) {
        await Video.deleteOne({ _id: exVid._id });
        globalDeleted++;
        console.log(`Deleted missing video from DB: ${exVid.publicId}`);
      }
    }

    let lessonOrderCounter = 1;
    let courseVideoCount = 0;

    // We sort mapped videos by public_id or display name so they appear in a predictable order
    mappedVideos.sort((a, b) => a.public_id.localeCompare(b.public_id));

    for (const resource of mappedVideos) {
      const displayName = resource.display_name || (resource.context && resource.context.custom && resource.context.custom.caption) || resource.public_id.split('/').pop()?.replace(/_/g, ' ') || 'Untitled Video';
      
      if (processedPublicIds.has(resource.public_id)) {
          // Already counted globally
          continue;
      }
      processedPublicIds.add(resource.public_id);
      courseVideoCount++;

      let playbackUrl = resource.secure_url;
      let thumbnailUrl = resource.secure_url;
      if (thumbnailUrl && resource.format) {
        thumbnailUrl = thumbnailUrl.replace(`.${resource.format}`, '.jpg');
        thumbnailUrl = thumbnailUrl.replace('/upload/', '/upload/so_auto,w_640,h_360,c_fill/');
      } else if (thumbnailUrl && !resource.format) {
         thumbnailUrl = thumbnailUrl + ".jpg";
         thumbnailUrl = thumbnailUrl.replace('/upload/', '/upload/so_auto,w_640,h_360,c_fill/');
      }

      // Upsert Video into MongoDB
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

      // Upsert Lesson to PRESERVE _id and student progress
      let existingLesson = await Lesson.findOne({ videoId: video._id, courseId: targetCourse._id });
      
      if (!existingLesson) {
        existingLesson = await Lesson.findOne({ 
          title: new RegExp(`^${displayName}$`, 'i'),
          courseId: targetCourse._id 
        });
      }

      if (!existingLesson) {
        await Lesson.create({
          moduleId: mainModule._id,
          courseId: targetCourse._id,
          title: displayName,
          videoId: video._id,
          order: lessonOrderCounter,
        });
      } else {
        existingLesson.title = displayName;
        existingLesson.videoId = video._id;
        existingLesson.order = lessonOrderCounter;
        await existingLesson.save();
      }
      
      lessonOrderCounter++;
    }
    
    courseStats.push({ courseName: targetCourse.title, count: courseVideoCount });
    console.log(`Course '${targetCourse.title}' Updated successfully with ${courseVideoCount} videos`);

    // FINAL CLEANUP: Delete Orphan Lessons
    const validVideoIds = mappedVideos.map(async (r) => {
      const v = await Video.findOne({ publicId: r.public_id });
      return v?._id;
    });
    const resolvedVideoIds = (await Promise.all(validVideoIds)).filter(Boolean);

    const orphanLessons = await Lesson.find({
      courseId: targetCourse._id,
      videoId: { $nin: resolvedVideoIds }
    });

    if (orphanLessons.length > 0) {
      for (const orphan of orphanLessons) {
        await Lesson.deleteOne({ _id: orphan._id });
        console.log(`Deleted orphan lesson without active video link: ${orphan.title}`);
      }
    }
  }

  console.log(`\n==========================================`);
  console.log(`Final Verification Summary`);
  console.log(`==========================================`);
  console.log(`Courses Found/Created: ${validFoldersFound.size}`);
  console.log(`Videos Found: ${allResources.length}`);
  console.log(`Videos Imported: ${globalImported}`);
  console.log(`Videos Updated: ${globalUpdated}`);
  console.log(`Videos Skipped: ${globalSkipped}`);
  console.log(`Videos Deleted: ${globalDeleted}`);
  console.log(`Modules Created: ${globalModulesCreated}`);

  const syncDate = new Date();

  const syncStat = new SyncStat({
    lastSync: syncDate,
    foldersFound: validFoldersFound.size,
    fetched: allResources.length,
    imported: globalImported,
    updated: globalUpdated,
    skipped: globalSkipped,
    deleted: globalDeleted,
    coursesCreated: globalCoursesCreated,
    modulesCreated: globalModulesCreated,
    courseStats: courseStats
  });
  await syncStat.save();

  return { 
    success: true, 
    message: `Sync complete. Fetched ${allResources.length} videos across ${validFoldersFound.size} courses.`,
    stats: { 
      foldersFound: validFoldersFound.size,
      fetched: allResources.length, 
      imported: globalImported, 
      updated: globalUpdated, 
      skipped: globalSkipped,
      deleted: globalDeleted,
      coursesCreated: globalCoursesCreated,
      modulesCreated: globalModulesCreated,
      lastSync: syncDate.toISOString(),
      courseStats: courseStats
    }
  };
};
