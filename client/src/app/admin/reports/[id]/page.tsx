'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';

enum ReportStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

interface UserProfile {
  id: number;
  charname: string;
  avatar_url: string | null;
  profileCompleted: boolean;
  isBanned: boolean;
  self?: string | null;
  photos?: {
    id: number;
    imageUrl: string;
  }[];
}

interface ReportDetails {
  id: number;
  reason: string;
  status: ReportStatus;
  reviewedBy?: number;
  reviewNote?: string;
  rewardAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export default function ReportDetailsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const reportId = params?.id as string;
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [report, setReport] = useState<ReportDetails | null>(null);
  const [reporter, setReporter] = useState<UserProfile | null>(null);
  const [reportedUser, setReportedUser] = useState<UserProfile | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state
  const [status, setStatus] = useState<ReportStatus>(ReportStatus.PENDING);
  const [reviewNote, setReviewNote] = useState('');
  const [banUser, setBanUser] = useState(false);
  const [rewardReporter, setRewardReporter] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(500); // Default reward amount
  
  const fetchReportDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.get(`http://localhost:3001/api/admin/reports/${reportId}`, {
        withCredentials: true
      });
      
      if (response.data.success) {
        setReport(response.data.report);
        setReporter(response.data.reporter);
        setReportedUser(response.data.reportedUser);
        
        // If the report has already been processed, update the form state
        if (response.data.report.status !== ReportStatus.PENDING) {
          setStatus(response.data.report.status);
          setReviewNote(response.data.report.reviewNote || '');
          setRewardAmount(response.data.report.rewardAmount || 500);
          setRewardReporter(!!response.data.report.rewardAmount);
        }
      }
    } catch (error) {
      console.error(t('adminReportDetail.fetchError') + ':', error);
      
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        router.push('/admin');
      } else {
        setError(t('adminReportDetail.fetchError') + ': ' + (axios.isAxiosError(error) ? error.response?.data?.message : t('error')));
      }
    } finally {
      setLoading(false);
    }
  }, [reportId, router, t]);
  
  useEffect(() => {
    fetchReportDetails();
  }, [fetchReportDetails]);
  
  const handleProcessReport = async () => {
    try {
      setProcessing(true);
      setError('');
      setSuccess('');
      
      const response = await axios.post(`http://localhost:3001/api/admin/reports/${reportId}/process`, {
        status,
        reviewNote,
        banUser,
        rewardReporter,
        rewardAmount: rewardReporter ? rewardAmount : null
      }, {
        withCredentials: true
      });
      
      if (response.data.success) {
        setSuccess(t('adminReportDetail.processSuccess'));
        
        // Update the report
        setReport({
          ...report!,
          status,
          reviewNote,
          rewardAmount: rewardReporter ? rewardAmount : undefined
        });
        
        // Update reportedUser if banned
        if (banUser && reportedUser) {
          setReportedUser({
            ...reportedUser,
            isBanned: true
          });
        }
        
        // Wait 2 seconds and return to reports list
        setTimeout(() => {
          router.push('/admin/reports');
        }, 2000);
      }
    } catch (error) {
      console.error(t('adminReportDetail.processError') + ':', error);
      setError(t('adminReportDetail.processError') + ': ' + (axios.isAxiosError(error) ? error.response?.data?.message : t('error')));
    } finally {
      setProcessing(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(t('language') === 'tr' ? 'tr-TR' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className="w-full pb-12">
      <div className="flex items-center mb-6">
        <Link href="/admin/reports" className="mr-4 text-pink-400 hover:text-pink-300">
          <span className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            {t('adminReportDetail.backToReports')}
          </span>
        </Link>
        <h1 className="text-2xl font-bold text-white">
          {t('adminReportDetail.reportNumber')} #{reportId} 
        </h1>
      </div>
      
      {error && (
        <div className="bg-red-900 text-red-200 border border-red-700 p-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-900 text-green-200 border border-green-700 p-3 rounded-lg mb-4">
          {success}
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : report ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel - Report information */}
          <div className="lg:col-span-1">
            <div className="bg-gray-700 rounded-xl shadow-md p-6 mb-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                <span className="mr-2">📝</span>
                {t('adminReportDetail.reportInfo')}
              </h2>
              
              <div className="mb-4">
                <div className="text-sm text-gray-400 mb-1">{t('adminReportDetail.reportNumber')}</div>
                <div className="font-medium text-gray-200">#{report.id}</div>
              </div>
              
              <div className="mb-4">
                <div className="text-sm text-gray-400 mb-1">{t('adminReportDetail.reportReason')}</div>
                <div className="p-3 bg-gray-800 rounded-lg text-gray-300">{report.reason}</div>
              </div>
              
              <div className="mb-4">
                <div className="text-sm text-gray-400 mb-1">{t('adminReports.status')}</div>
                <div>
                  {report.status === ReportStatus.PENDING && (
                    <span className="px-2 py-1 text-xs bg-yellow-900 text-yellow-200 rounded-full">{t('adminReports.pending')}</span>
                  )}
                  {report.status === ReportStatus.APPROVED && (
                    <span className="px-2 py-1 text-xs bg-green-900 text-green-200 rounded-full">{t('adminReports.approved')}</span>
                  )}
                  {report.status === ReportStatus.REJECTED && (
                    <span className="px-2 py-1 text-xs bg-red-900 text-red-200 rounded-full">{t('adminReports.rejected')}</span>
                  )}
                </div>
              </div>
              
              <div className="mb-4">
                <div className="text-sm text-gray-400 mb-1">{t('adminReportDetail.reportDate')}</div>
                <div className="text-gray-300">{formatDate(report.createdAt)}</div>
              </div>
              
              {report.status !== ReportStatus.PENDING && (
                <>
                  <div className="mb-4">
                    <div className="text-sm text-gray-400 mb-1">{t('adminReportDetail.reviewNote')}</div>
                    <div className="p-3 bg-gray-800 rounded-lg text-gray-300">
                      {report.reviewNote || t('adminReportDetail.noNote')}
                    </div>
                  </div>
                  
                  {report.rewardAmount && (
                    <div className="mb-4">
                      <div className="text-sm text-gray-400 mb-1">{t('adminReportDetail.rewardGiven')}</div>
                      <div className="font-medium text-green-400">{report.rewardAmount} {t('adminUserDetail.coins')}</div>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Reporter information */}
            {reporter && (
              <div className="bg-gray-700 rounded-xl shadow-md p-6 mb-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                  <span className="mr-2">👤</span>
                  {t('adminReportDetail.reportingUser')}
                </h2>
                
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0 h-16 w-16 relative">
                    {reporter.avatar_url ? (
                        <Image
                          src={reporter.avatar_url}
                          alt={reporter.charname}
                        width={64}
                        height={64}
                        className="rounded-full object-cover"
                        />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-gray-600 flex items-center justify-center">
                        <span className="text-gray-300 text-xl">{reporter.charname.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div className="ml-4 overflow-hidden">
                    <div className="text-lg font-medium text-gray-200 truncate">
                      {reporter.charname}
                    </div>
                    <div className="text-sm text-gray-400">
                      {t('adminReportDetail.userId')}: {reporter.id}
                    </div>
                    
                    {reporter.isBanned && (
                      <div className="mt-1 text-sm text-red-400 bg-red-900 bg-opacity-30 px-2 py-0.5 rounded">
                        {t('adminReports.bannedUser')}
                      </div>
                    )}
                  </div>
                </div>
                
                  <Link 
                    href={`/admin/users/${reporter.id}`}
                  className="w-full block text-center px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                  >
                  {t('adminReportDetail.viewUserProfile')}
                  </Link>
              </div>
            )}
          </div>
          
          {/* Right panel - Reported user and form */}
          <div className="lg:col-span-2">
            {/* Reported user */}
            {reportedUser && (
              <div className="bg-gray-700 rounded-xl shadow-md p-6 mb-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                  <span className="mr-2">🚩</span>
                  {t('adminReportDetail.reportedUser')}
                </h2>
                
                <div className="flex flex-col md:flex-row items-start mb-4">
                  <div className="flex-shrink-0 h-24 w-24 relative mb-4 md:mb-0">
                    {reportedUser.avatar_url ? (
                        <Image
                          src={reportedUser.avatar_url}
                          alt={reportedUser.charname}
                        width={96}
                        height={96}
                        className="rounded-full object-cover"
                        />
                    ) : (
                      <div className="h-24 w-24 rounded-full bg-gray-600 flex items-center justify-center">
                        <span className="text-gray-300 text-2xl">{reportedUser.charname.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div className="md:ml-6 w-full">
                    <div className="flex flex-col w-full">
                      <div className="mb-2">
                        <div className="text-xl font-medium text-gray-200">
                          {reportedUser.charname}
                        </div>
                        <div className="text-sm text-gray-400">
                          {t('adminReportDetail.userId')}: {reportedUser.id}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Link
                          href={`/admin/users/${reportedUser.id}`}
                          className="inline-block px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
                        >
                          {t('adminReportDetail.viewProfile')}
                        </Link>
                        
                      {reportedUser.isBanned ? (
                          <span className="inline-block px-3 py-1 bg-red-900 text-red-200 rounded">
                            {t('adminReports.bannedUser')}
                          </span>
                        ) : report.status === ReportStatus.PENDING && (
                          <button
                            onClick={() => setBanUser(!banUser)}
                            className={`px-3 py-1 rounded transition-colors ${
                              banUser ? 'bg-red-900 text-red-200 border border-red-700' : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                            }`}
                          >
                            {banUser ? t('adminReportDetail.dontBan') + ' ✓' : t('adminReportDetail.banUser')}
                          </button>
                        )}
                  </div>
                </div>
                
                {reportedUser.self && (
                      <div className="mt-1">
                        <div className="text-sm text-gray-400 mb-1">{t('adminUserDetail.about')}</div>
                        <div 
                          className="p-3 bg-gray-800 rounded-lg text-gray-300 max-h-28 overflow-y-auto" 
                          style={{ 
                            wordBreak: 'break-word', 
                            overflowWrap: 'break-word',
                            whiteSpace: 'pre-line',
                            wordWrap: 'break-word'
                          }}
                        >
                      {reportedUser.self}
                    </div>
                  </div>
                )}
                  </div>
                </div>
                
                {/* User photos */}
                {reportedUser.photos && reportedUser.photos.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm text-gray-400 mb-2">{t('adminUserDetail.photos')}</div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {reportedUser.photos.map((photo) => (
                        <div key={photo.id} className="aspect-square relative rounded-lg overflow-hidden">
                          <Image
                            src={photo.imageUrl}
                            alt=""
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Report processing form */}
            {report.status === ReportStatus.PENDING && (
              <div className="bg-gray-700 rounded-xl shadow-md p-6">
                <h2 className="text-lg font-bold text-white mb-4">
                  {t('adminReportDetail.reportProcess')}
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 mb-2">{t('adminReports.status')}</label>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setStatus(ReportStatus.APPROVED)}
                        className={`px-4 py-2 rounded-lg ${
                          status === ReportStatus.APPROVED 
                            ? 'bg-green-900 text-green-200 border border-green-700' 
                            : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                        }`}
                      >
                        {t('adminReportDetail.approve')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatus(ReportStatus.REJECTED)}
                        className={`px-4 py-2 rounded-lg ${
                          status === ReportStatus.REJECTED 
                            ? 'bg-red-900 text-red-200 border border-red-700' 
                            : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                        }`}
                      >
                        {t('adminReportDetail.reject')}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-2" htmlFor="reviewNote">
                      {t('adminReportDetail.reviewNote')}
                    </label>
                    <textarea
                      id="reviewNote"
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
                      rows={4}
                      placeholder={t('adminReportDetail.reviewNotePlaceholder')}
                    />
                  </div>
                  
                  {status === ReportStatus.APPROVED && (
                    <>
                      <div className="border-t border-gray-600 my-4 pt-4">
                        <label className="flex items-center text-gray-300 mb-4">
                          <input
                            type="checkbox"
                            checked={banUser}
                            onChange={() => setBanUser(!banUser)}
                            className="mr-2 h-5 w-5 rounded border-gray-600 bg-gray-700 text-pink-600 focus:ring-2 focus:ring-pink-500"
                          />
                          {t('adminReportDetail.banUserCheckbox')}
                        </label>
                      </div>
                        
                      <div className="border-t border-gray-600 my-4 pt-4">
                        <label className="flex items-center text-gray-300 mb-4">
                          <input
                            type="checkbox"
                            checked={rewardReporter}
                            onChange={() => setRewardReporter(!rewardReporter)}
                            className="mr-2 h-5 w-5 rounded border-gray-600 bg-gray-700 text-pink-600 focus:ring-2 focus:ring-pink-500"
                          />
                          {t('adminReportDetail.rewardReporter')}
                        </label>
                        
                        {rewardReporter && (
                          <div className="ml-7 mt-2">
                            <label className="block text-gray-300 mb-2" htmlFor="rewardAmount">
                              {t('adminReportDetail.rewardAmount')}
                            </label>
                            <input
                              type="number"
                              id="rewardAmount"
                              value={rewardAmount}
                              min={100}
                              max={10000}
                              step={100}
                              onChange={(e) => setRewardAmount(parseInt(e.target.value))}
                              className="w-32 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
                            />
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  
                  <div className="flex justify-end mt-6">
                    <button
                      type="button"
                      onClick={handleProcessReport}
                      disabled={processing}
                      className={`px-6 py-2 bg-pink-700 hover:bg-pink-600 text-white rounded-lg transition-colors ${
                        processing ? 'opacity-70 cursor-not-allowed' : ''
                      }`}
                    >
                      {processing ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {t('adminReportDetail.processing')}
                        </span>
                      ) : (
                        t('adminReportDetail.processReport')
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gray-700 rounded-xl shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-gray-400 text-xl">📋</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-300 mb-2">{t('adminReportDetail.reportNotFound')}</h3>
          <p className="text-gray-400">
            {t('adminReportDetail.reportNotFoundDesc')}
          </p>
        </div>
      )}
    </div>
  );
} 