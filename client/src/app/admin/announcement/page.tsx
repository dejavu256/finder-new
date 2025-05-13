'use client';

import React, { useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import { MegaphoneIcon, PencilIcon, TrashIcon, InformationCircleIcon, CodeBracketIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';

interface Announcement {
  id: number;
  slot: number;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AnnouncementPage() {
  const { t } = useLanguage();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showHtmlHelp, setShowHtmlHelp] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.get('http://localhost:3001/api/admin/announcements', {
        withCredentials: true
      });
      
      if (response.data.success) {
        setAnnouncements(response.data.announcements);
      } else {
        setError(response.data.message || 'Duyurular getirilirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Duyuru getirme hatası:', error);
      setError('Duyurular getirilirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitLoading(true);
      setError('');
      
      if (!formData.title || !formData.content) {
        setError('Başlık ve içerik alanları zorunludur');
        return;
      }
      
      let response;
      
      if (editingId) {
        // Duyuru güncelleme
        response = await axios.put(`http://localhost:3001/api/admin/announcements/${editingId}`, formData, {
          withCredentials: true
        });
      } else {
        // Yeni duyuru ekleme
        response = await axios.post('http://localhost:3001/api/admin/announcements', formData, {
          withCredentials: true
        });
      }
      
      if (response.data.success) {
        // Formu sıfırla
        setFormData({
          title: '',
          content: ''
        });
        setEditingId(null);
        
        // Duyuruları yeniden getir
        fetchAnnouncements();
      } else {
        setError(response.data.message || 'İşlem sırasında bir hata oluştu');
      }
    } catch (error: Error | unknown) {
      console.error('Duyuru işleme hatası:', error);
      const axiosError = error as AxiosError<{message?: string}>;
      setError(axiosError.response?.data?.message || 'İşlem sırasında bir hata oluştu');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setFormData({
      title: announcement.title,
      content: announcement.content
    });
    setEditingId(announcement.id);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('admin.announcement.deleteConfirm'))) {
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.delete(`http://localhost:3001/api/admin/announcements/${id}`, {
        withCredentials: true
      });
      
      if (response.data.success) {
        // Duyuruları yeniden getir
        fetchAnnouncements();
      } else {
        setError(response.data.message || 'Duyuru silinirken bir hata oluştu');
      }
    } catch (error: Error | unknown) {
      console.error('Duyuru silme hatası:', error);
      const axiosError = error as AxiosError<{message?: string}>;
      setError(axiosError.response?.data?.message || 'Duyuru silinirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.put(`http://localhost:3001/api/admin/announcements/${id}`, {
        isActive: !currentStatus
      }, {
        withCredentials: true
      });
      
      if (response.data.success) {
        // Duyuruları yeniden getir
        fetchAnnouncements();
      } else {
        setError(response.data.message || 'Duyuru durumu güncellenirken bir hata oluştu');
      }
    } catch (error: Error | unknown) {
      console.error('Duyuru durumu güncelleme hatası:', error);
      const axiosError = error as AxiosError<{message?: string}>;
      setError(axiosError.response?.data?.message || 'Duyuru durumu güncellenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const insertHtmlTag = (tag: string) => {
    let snippet = '';
    switch(tag) {
      case 'img':
        snippet = '<img src="https://example.com/image.jpg" alt="Açıklama" style="max-width:100%;height:auto;" />';
        break;
      case 'b':
        snippet = '<b>Kalın yazı</b>';
        break;
      case 'i':
        snippet = '<i>İtalik yazı</i>';
        break;
      case 'ul':
        snippet = '<ul>\n  <li>Madde 1</li>\n  <li>Madde 2</li>\n  <li>Madde 3</li>\n</ul>';
        break;
      case 'a':
        snippet = '<a href="https://example.com" target="_blank">Link metni</a>';
        break;
      default:
        return;
    }
    
    setFormData(prev => ({
      ...prev,
      content: prev.content + snippet
    }));
  };

  const htmlExamples = [
    { tag: 'img', text: t('admin.announcement.image') },
    { tag: 'b', text: t('admin.announcement.bold') },
    { tag: 'i', text: t('admin.announcement.italic') },
    { tag: 'ul', text: t('admin.announcement.list') },
    { tag: 'a', text: t('admin.announcement.link') }
  ];

  return (
    <div className="max-w-6xl mx-auto px-2 py-3">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-lg font-bold text-pink-400">{t('admin.announcement.pageTitle')}</h1>
        <button 
          onClick={() => setShowHtmlHelp(!showHtmlHelp)}
          className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded flex items-center"
        >
          <CodeBracketIcon className="h-3 w-3 mr-1" />
          {t('admin.announcement.htmlHelp')}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-2 py-1.5 rounded mb-3 text-xs">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Duyuru Formu */}
        <div className="bg-gray-800 shadow-md rounded-lg p-3">
          <h2 className="text-sm font-semibold mb-2 text-pink-300">
            {editingId ? t('admin.announcement.editTitle') : t('admin.announcement.addTitle')}
          </h2>
          
          {showHtmlHelp && (
            <div className="bg-gray-700 rounded-md p-2 mb-2 text-xs text-gray-300">
              <div className="flex items-center mb-1">
                <InformationCircleIcon className="h-3 w-3 mr-1 text-pink-300" />
                <span className="text-pink-300 font-medium">{t('admin.announcement.htmlTags')}</span>
              </div>
              <div className="flex flex-wrap gap-1 mb-1.5">
                {htmlExamples.map(item => (
                  <button
                    key={item.tag}
                    onClick={() => insertHtmlTag(item.tag)}
                    className="bg-gray-600 hover:bg-gray-500 rounded px-1.5 py-0.5 text-gray-200 text-xs flex items-center"
                  >
                    <CodeBracketIcon className="h-2.5 w-2.5 mr-0.5" />
                    {item.text}
                  </button>
                ))}
              </div>
              <div className="text-xs text-gray-400 border-t border-gray-600 pt-1">
                {t('admin.announcement.htmlHelpDesc')}
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-2">
            <div>
              <label className="block text-gray-300 font-medium mb-1 text-xs">{t('admin.announcement.titleLabel')}</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-pink-500 text-white text-xs"
                placeholder={t('admin.announcement.titlePlaceholder')}
                maxLength={100}
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-300 font-medium mb-1 text-xs">{t('admin.announcement.contentLabel')}</label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-pink-500 text-white text-xs font-mono"
                placeholder={t('admin.announcement.contentPlaceholder')}
                rows={8}
                required
              ></textarea>
            </div>
            
            <div className="flex justify-between pt-1">
              <button
                type="submit"
                disabled={submitLoading}
                className="bg-pink-600 text-white px-2 py-1 rounded-md hover:bg-pink-700 focus:outline-none focus:ring-1 focus:ring-pink-500 text-xs"
              >
                {submitLoading ? t('admin.announcement.processing') : (editingId ? t('admin.announcement.updateButton') : t('admin.announcement.addButton'))}
              </button>
              
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ title: '', content: '' });
                    setEditingId(null);
                  }}
                  className="bg-gray-600 text-white px-2 py-1 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-500 text-xs"
                >
                  {t('admin.announcement.cancelButton')}
                </button>
              )}
            </div>
          </form>
        </div>
        
        {/* Duyuru Listesi */}
        <div className="bg-gray-800 shadow-md rounded-lg p-3">
          <h2 className="text-sm font-semibold mb-2 text-pink-300">{t('admin.announcement.currentAnnouncements')}</h2>
          
          {loading ? (
            <p className="text-gray-400 text-xs">{t('admin.announcement.loading')}</p>
          ) : announcements.length === 0 ? (
            <p className="text-gray-400 text-xs">{t('admin.announcement.noAnnouncements')}</p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {announcements.map(announcement => (
                <div key={announcement.id} className="border border-gray-700 rounded-md p-2 bg-gray-750">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <MegaphoneIcon className="h-3 w-3 text-pink-400 flex-shrink-0" />
                        <h3 className="font-medium text-white text-xs truncate">{announcement.title}</h3>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{t('admin.announcement.slot')}: {announcement.slot}</p>
                      <div className="mt-1 text-gray-300 text-xs max-h-16 overflow-y-auto border-t border-gray-700 pt-1">
                        <div dangerouslySetInnerHTML={{ __html: announcement.content }} className="prose-sm max-w-none prose-invert" />
                      </div>
                    </div>
                    
                    <div className="flex space-x-1 ml-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(announcement)}
                        className="text-blue-400 hover:text-blue-300 p-1"
                        title={t('admin.announcement.editAction')}
                      >
                        <PencilIcon className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(announcement.id)}
                        className="text-red-400 hover:text-red-300 p-1"
                        title={t('admin.announcement.deleteAction')}
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-1 flex items-center">
                    <span className="text-xs mr-1.5 text-gray-400">{t('admin.announcement.status')}:</span>
                    <button
                      onClick={() => handleToggleActive(announcement.id, announcement.isActive)}
                      className={`px-1.5 py-0.5 text-xs rounded-full ${
                        announcement.isActive
                          ? 'bg-green-900 text-green-300'
                          : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      {announcement.isActive ? t('admin.announcement.active') : t('admin.announcement.passive')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 