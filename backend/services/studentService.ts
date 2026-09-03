import User from '../models/User';

export const getRegisteredStudentsForDirectory = async () => {
  // Source of truth for registered students shown in the directory
  return await User.find({ role: 'Student' }).select('-password -__v').lean();
};
