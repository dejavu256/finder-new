'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';

enum ReportStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

interface Reporter {
  id: number;
  charname: string;
  avatar_url: string | null;
}

interface ReportedUser {
  id: number;
  charname: string;
  avatar_url: string | null;
  isBanned: boolean;
}

interface Report {
  id: number;
  reporter: Reporter;
  reportedUser: ReportedUser;
  reason: string;
  status: ReportStatus;
  reviewedBy?: number;
  reviewNote?: string;
  rewardAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export default function ReportsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('PENDING');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalReports, setTotalReports] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');
  
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.get(`http://localhost:3001/api/admin/reports`, {
        params: {
          status: selectedStatus,
          page: currentPage,
          limit: 10
        },
        withCredentials: true
      });
      
      if (response.data.success) {
        setReports(response.data.reports);
        setTotalReports(response.data.pagination.total);
        setTotalPages(response.data.pagination.pages);
      }
    } catch (error) {
      console.error(t('admin.reports') + ' ' + t('error') + ':', error);
      
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        router.push('/admin');
      } else {
        setError(t('adminReports.fetchError') + ': ' + (axios.isAxiosError(error) ? error.response?.data?.message : t('error')));
      }
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, currentPage, router, t]);
  
  useEffect(() => {
    fetchReports();
  }, [fetchReports]);
  
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
  
  const getReasonShort = (reason: string) => {
    if (reason.length > 30) {
      return reason.substring(0, 30) + '...';
    }
    return reason;
  };
  
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">{t('adminReports.title')}</h1>
      </div>
      
      <div className="bg-gray-700 rounded-xl shadow-md p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setSelectedStatus('PENDING'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              selectedStatus === 'PENDING' 
                ? 'bg-yellow-900 text-yellow-200' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {t('adminReports.pending')}
          </button>
          <button
            onClick={() => { setSelectedStatus('APPROVED'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              selectedStatus === 'APPROVED' 
                ? 'bg-green-900 text-green-200' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {t('adminReports.approved')}
          </button>
          <button
            onClick={() => { setSelectedStatus('REJECTED'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              selectedStatus === 'REJECTED' 
                ? 'bg-red-900 text-red-200' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {t('adminReports.rejected')}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-900 text-red-200 border border-red-700 p-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-gray-700 rounded-xl shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-gray-400 text-xl">📋</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-300 mb-2">{t('adminReports.noReports')}</h3>
          <p className="text-gray-400">
            {t('adminReports.noReportsForStatus')}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-gray-700 rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-600">
                <thead className="bg-gray-800">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      {t('adminReports.reportNumber')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      {t('adminReports.reporter')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      {t('adminReports.reportedUser')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      {t('adminReports.reason')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      {t('adminReports.date')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      {t('adminReports.status')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                      {t('adminReports.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-700 divide-y divide-gray-600">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-600">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        #{report.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 relative">
                            {report.reporter.avatar_url ? (
                              <Image
                                src={report.reporter.avatar_url}
                                alt={report.reporter.charname}
                                width={32}
                                height={32}
                                className="rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center">
                                <span className="text-gray-300 text-xs">{report.reporter.charname.charAt(0)}</span>
                              </div>
                            )}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-200">
                              {report.reporter.charname}
                            </div>
                            <div className="text-xs text-gray-400">
                              ID: {report.reporter.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 relative">
                            {report.reportedUser.avatar_url ? (
                              <Image
                                src={report.reportedUser.avatar_url}
                                alt={report.reportedUser.charname}
                                width={32}
                                height={32}
                                className="rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center">
                                <span className="text-gray-300 text-xs">{report.reportedUser.charname.charAt(0)}</span>
                              </div>
                            )}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-200">
                              {report.reportedUser.charname}
                            </div>
                            <div className="text-xs text-gray-400">
                              ID: {report.reportedUser.id}
                            </div>
                            {report.reportedUser.isBanned && (
                              <div className="text-xs text-red-400 mt-1">
                                {t('adminReports.bannedUser')}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {getReasonShort(report.reason)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatDate(report.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {report.status === ReportStatus.PENDING && (
                          <span className="px-2 py-1 text-xs bg-yellow-900 text-yellow-200 rounded-full">{t('adminReports.pending')}</span>
                        )}
                        {report.status === ReportStatus.APPROVED && (
                          <span className="px-2 py-1 text-xs bg-green-900 text-green-200 rounded-full">{t('adminReports.approved')}</span>
                        )}
                        {report.status === ReportStatus.REJECTED && (
                          <span className="px-2 py-1 text-xs bg-red-900 text-red-200 rounded-full">{t('adminReports.rejected')}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link 
                          href={`/admin/reports/${report.id}`}
                          className="text-pink-400 hover:text-pink-300 px-3 py-1 rounded-md border border-pink-900 bg-pink-900 bg-opacity-20 hover:bg-opacity-30 transition-colors"
                        >
                          {t('adminReports.review')}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Pagination */}
          <div className="mt-6 flex justify-between items-center">
            <div className="text-sm text-gray-400">
              {t('adminReports.totalReports', { count: totalReports.toString() })}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage <= 1}
                className={`px-3 py-1 rounded border ${
                  currentPage <= 1
                    ? 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'
                    : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                }`}
              >
                {t('adminReports.previous')}
              </button>
              <span className="px-3 py-1 text-center rounded bg-gray-700 text-gray-300 border border-gray-600 min-w-[40px]">
                {currentPage}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage >= totalPages}
                className={`px-3 py-1 rounded border ${
                  currentPage >= totalPages
                    ? 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'
                    : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                }`}
              >
                {t('adminReports.next')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 