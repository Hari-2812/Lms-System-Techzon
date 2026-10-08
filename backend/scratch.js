const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/techzon').then(async () => {
  const Course = mongoose.model('Course', new mongoose.Schema({ title: String }));
  const CourseProjectConfig = mongoose.model('CourseProjectConfig', new mongoose.Schema({ courseId: mongoose.Schema.Types.ObjectId, minorProject: Object }));
  
  const aiCourse = await Course.findOne({ title: /AI/i });
  console.log("AI Course:", aiCourse);
  
  if (aiCourse) {
    const config = await CourseProjectConfig.findOne({ courseId: aiCourse._id });
    console.log("Config for AI Course ID:", config);
    const allConfigs = await CourseProjectConfig.find();
    console.log("All Configs:");
    allConfigs.forEach(c => console.log(c.courseId));
  }
  process.exit(0);
}).catch(console.error);
