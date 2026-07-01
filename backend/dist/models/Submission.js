"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const SubmissionSchema = new mongoose_1.Schema({
    assignmentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Assignment', required: true, index: true },
    studentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    submissionType: {
        type: String,
        enum: ['pdf', 'zip', 'github', 'gdrive'],
        required: true,
    },
    fileUrl: { type: String },
    repoUrl: { type: String },
    gdriveUrl: { type: String },
    notes: { type: String },
    status: {
        type: String,
        enum: ['submitted', 'graded', 'late', 'returned'],
        default: 'submitted',
    },
    marksObtained: { type: Number },
    feedback: { type: String },
    gradedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    gradedAt: { type: Date },
    submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });
// Allow one submission per student per assignment
SubmissionSchema.index({ studentId: 1, assignmentId: 1 }, { unique: true });
exports.default = mongoose_1.default.model('Submission', SubmissionSchema);
