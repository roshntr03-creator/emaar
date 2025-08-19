import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Attachment } from '../types';
import { UploadCloud, FileText, FileImage, File, Trash2, Download, Loader2, Paperclip } from 'lucide-react';
import { isFirebaseConfigured } from '../firebase/config';
import * as localApi from '../api';
import * as firebaseApi from '../firebase/api';

interface AttachmentsManagerProps {
  relatedId: string;
  relatedType: string;
}

const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <FileImage className="w-6 h-6 text-blue-500" />;
    if (fileType === 'application/pdf') return <FileText className="w-6 h-6 text-red-500" />;
    return <File className="w-6 h-6 text-gray-500" />;
};

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const AttachmentsManager: React.FC<AttachmentsManagerProps> = ({ relatedId, relatedType }) => {
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const usingFirebase = isFirebaseConfigured();
    const api = usingFirebase ? firebaseApi : localApi;

    const fetchAttachments = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await api.getAttachments(relatedId, relatedType);
            setAttachments(data);
        } catch (error) {
            console.error("Failed to fetch attachments", error);
        } finally {
            setIsLoading(false);
        }
    }, [relatedId, relatedType, api]);

    useEffect(() => {
        fetchAttachments();
    }, [fetchAttachments]);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        try {
            for (const file of Array.from(files)) {
                await api.addAttachment(file, relatedId, relatedType);
            }
            await fetchAttachments(); // Refresh the list
        } catch (error) {
            console.error("Failed to upload file", error);
            alert(`فشل رفع الملف: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDelete = async (attachmentId: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا المرفق؟')) {
            try {
                await api.deleteAttachment(attachmentId);
                setAttachments(prev => prev.filter(att => att.id !== attachmentId));
            } catch (error) {
                console.error("Failed to delete attachment", error);
                alert('فشل حذف المرفق.');
            }
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div>
            <div className="flex justify-end mb-4">
                <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isUploading}
                />
                <button
                    onClick={handleUploadClick}
                    disabled={isUploading}
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                >
                    {isUploading ? (
                        <>
                            <Loader2 size={16} className="ml-2 animate-spin" />
                            جاري الرفع...
                        </>
                    ) : (
                        <>
                            <UploadCloud size={16} className="ml-2" />
                            رفع ملفات
                        </>
                    )}
                </button>
            </div>
            
            {isLoading ? (
                 <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 mx-auto text-gray-400 animate-spin" />
                    <p className="mt-2 text-sm text-gray-500">جاري تحميل المرفقات...</p>
                </div>
            ) : attachments.length > 0 ? (
                <div className="space-y-3">
                    {attachments.map(att => (
                        <div key={att.id} className="flex items-center p-3 border rounded-md bg-gray-50 hover:bg-gray-100">
                            <div className="ml-3 flex-shrink-0">{getFileIcon(att.fileType)}</div>
                            <div className="flex-grow">
                                <p className="font-medium text-gray-800">{att.fileName}</p>
                                <p className="text-xs text-gray-500">
                                    {formatFileSize(att.fileSize)} - تم الرفع في: {new Date(att.uploadedAt).toLocaleDateString('ar-SA')}
                                </p>
                            </div>
                            <div className="flex items-center space-x-2 space-x-reverse">
                                <a href={att.url} download={att.fileName} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-500 hover:text-blue-600" title="تنزيل">
                                    <Download size={18} />
                                </a>
                                <button onClick={() => handleDelete(att.id)} className="p-2 text-gray-500 hover:text-red-600" title="حذف">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <Paperclip size={40} className="mx-auto text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">لا توجد مستندات مرفقة.</p>
                    <p className="text-xs text-gray-400">ابدأ برفع أول ملف للمشروع.</p>
                </div>
            )}
        </div>
    );
};

export default AttachmentsManager;