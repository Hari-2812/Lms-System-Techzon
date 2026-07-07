import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import Course from '../models/Course';
import Module from '../models/Module';
import Lesson from '../models/Lesson';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function formatTitle(filename: string): string {
  const name = filename.split('/').pop() || filename;
  if (/^\d+$/.test(name)) {
    return `Lesson ${name}`;
  }
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI is not set in .env');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  console.log('Fetching video resources from Cloudinary...');
  const result = await cloudinary.api.resources({
    resource_type: 'video',
    type: 'upload',
    max_results: 100,
  });

  const videos = result.resources;
  console.log(`Found ${videos.length} video(s) in Cloudinary.`);

  if (videos.length === 0) {
    console.log('No videos to import. Exiting.');
    await mongoose.disconnect();
    return;
  }

  let course = await Course.findOne({ title: 'Full Stack MERN Development' });
  if (!course) {
    console.log('Course "Full Stack MERN Development" not found. Creating...');
    course = await Course.create({
      title: 'Full Stack MERN Development',
      slug: 'full-stack-mern-development',
      description: 'Complete Full Stack MERN Development course with recorded classes.',
      category: 'Web Development',
      status: 'published',
    });
    console.log(`Course created with ID: ${course._id}`);
  } else {
    console.log(`Found existing course: ${course.title} (${course._id})`);
  }

  let module = await Module.findOne({ courseId: course._id, title: 'Recorded Classes' });
  if (!module) {
    console.log('Module "Recorded Classes" not found. Creating...');
    const lastModule = await Module.findOne({ courseId: course._id }).sort({ order: -1 });
    const nextOrder = lastModule ? lastModule.order + 1 : 1;
    module = await Module.create({
      courseId: course._id,
      title: 'Recorded Classes',
      order: nextOrder,
    });
    console.log(`Module created with ID: ${module._id}`);
  } else {
    console.log(`Found existing module: ${module.title} (${module._id})`);
  }

  const lastLesson = await Lesson.findOne({ moduleId: module._id }).sort({ order: -1 });
  let currentOrder = lastLesson ? lastLesson.order + 1 : 1;
  let imported = 0;
  let skipped = 0;

  for (const resource of videos) {
    const existingLesson = await Lesson.findOne({ 'video.publicId': resource.public_id });
    if (existingLesson) {
      console.log(`Skipping "${resource.public_id}" — lesson already exists.`);
      skipped++;
      continue;
    }

    const title = formatTitle(resource.public_id);
    const lesson = await Lesson.create({
      moduleId: module._id,
      courseId: course._id,
      title,
      video: {
        url: resource.secure_url,
        publicId: resource.public_id,
        duration: resource.duration || 0,
      },
      videoUrl: resource.secure_url,
      order: currentOrder,
    });

    console.log(`[${currentOrder}] Imported: "${title}" (publicId: ${resource.public_id}, id: ${lesson._id})`);
    currentOrder++;
    imported++;
  }

  console.log(`\nImport complete. Imported: ${imported}, Skipped: ${skipped}, Total: ${videos.length}`);

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
}

main().catch((err) => {
  console.error('Import failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
