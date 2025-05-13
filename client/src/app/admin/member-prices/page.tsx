'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import ResponsiveTable from '../components/ResponsiveTable';

interface Price {
  id: number;
  itemType: string;
  itemKey: string;
  price: number;
  isActive: boolean;
  updatedAt: string;
  createdAt: string;
}

interface GroupedPrices {
  coinRates: Price[];
  goldMembership: Price[];
  platinumMembership: Price[];
}

export default function MemberPricesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [prices, setPrices] = useState<GroupedPrices>({
    coinRates: [],
    goldMembership: [],
    platinumMembership: []
  });
  const [editingPrice, setEditingPrice] = useState<Price | null>(null);
  const [newPrice, setNewPrice] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    loadPrices();
  }, []);

  // Fiyatları yükle
  const loadPrices = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3001/api/admin/prices', {
        withCredentials: true
      });

      if (response.data.success) {
        setPrices(response.data.prices);
      } else {
        setError('Fiyat bilgileri alınamadı');
      }
    } catch (error) {
      console.error('Fiyat bilgisi yükleme hatası:', error);
      setError('Fiyat bilgileri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Fiyat düzenleme modunu aç
  const handleEditPrice = (price: Price) => {
    setEditingPrice(price);
    setNewPrice(price.price.toString());
    setIsActive(price.isActive);
  };

  // Fiyat düzenleme modunu kapat
  const handleCancelEdit = () => {
    setEditingPrice(null);
    setNewPrice('');
    setIsActive(true);
  };

  // Fiyat güncelle
  const handleSavePrice = async () => {
    if (!editingPrice) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await axios.post('http://localhost:3001/api/admin/update-price', {
        id: editingPrice.id,
        price: newPrice,
        isActive: isActive,
        oldPrice: editingPrice.price
      }, {
        withCredentials: true
      });

      if (response.data.success) {
        setSuccess('Fiyat başarıyla güncellendi');
        loadPrices(); // Fiyatları yeniden yükle
        setEditingPrice(null);
      } else {
        setError(response.data.message || 'Fiyat güncellenirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Fiyat güncelleme hatası:', error);
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.message || 'Fiyat güncellenirken bir hata oluştu');
      } else {
        setError('Fiyat güncellenirken bir hata oluştu');
      }
    } finally {
      setSaving(false);
    }
  };

  // İtem anahtarını kullanıcı dostu metne çevir
  const getPriceKeyLabel = (type: string, key: string) => {
    if (type === 'COIN_RATE' && key === 'default') {
      return 'Coin birim fiyatı (USD/coin)';
    }
    if (key === '7' || key === '30' || key === '90') {
      return `${key} günlük üyelik`;
    }
    return key;
  };

  // Fiyat formatla
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  // Tarihi formatla
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-800 text-white pt-6 px-4 pb-10">
      <div className="max-w-6xl mx-auto">
        {/* Üst başlık */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Üyelik Fiyatları Yönetimi</h1>
          <Link
            href="/admin"
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
          >
            Admin Paneline Dön
          </Link>
        </div>

        {/* Başarı ve Hata mesajları */}
        {success && (
          <div className="bg-green-800 text-green-100 p-4 rounded-lg mb-6">
            {success}
          </div>
        )}
        {error && (
          <div className="bg-red-800 text-red-100 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Yükleniyor */}
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Coin Fiyatları */}
            <div className="bg-gray-700 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4 text-pink-400">Coin Fiyatları</h2>
              <ResponsiveTable>
                <table className="min-w-full divide-y divide-gray-600">
                  <thead className="bg-gray-800">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Açıklama
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Fiyat
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Durum
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Son Güncelleme
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-700 divide-y divide-gray-600">
                    {prices.coinRates.map((price) => (
                      <tr key={price.id} className="hover:bg-gray-650">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                          {getPriceKeyLabel(price.itemType, price.itemKey)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                          {editingPrice?.id === price.id ? (
                            <input
                              type="number"
                              value={newPrice}
                              onChange={(e) => setNewPrice(e.target.value)}
                              className="bg-gray-800 text-white border border-gray-600 rounded px-3 py-1 w-24"
                              step="0.01"
                              min="0.01"
                            />
                          ) : (
                            formatPrice(price.price)
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {editingPrice?.id === price.id ? (
                            <label className="inline-flex items-center">
                              <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                                className="rounded bg-gray-800 border-gray-600 text-pink-500 focus:ring-pink-500"
                              />
                              <span className="ml-2 text-gray-200">Aktif</span>
                            </label>
                          ) : (
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${price.isActive ? 'bg-green-800 text-green-100' : 'bg-red-800 text-red-100'}`}>
                              {price.isActive ? 'Aktif' : 'Devre Dışı'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                          {formatDate(price.updatedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                          {editingPrice?.id === price.id ? (
                            <div className="flex space-x-2">
                              <button
                                onClick={handleSavePrice}
                                disabled={saving || !newPrice || isNaN(parseFloat(newPrice)) || parseFloat(newPrice) <= 0}
                                className={`bg-pink-600 hover:bg-pink-700 text-white px-3 py-1 rounded text-xs ${(saving || !newPrice || isNaN(parseFloat(newPrice)) || parseFloat(newPrice) <= 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {saving ? 'Kaydediliyor...' : 'Kaydet'}
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded text-xs"
                              >
                                İptal
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEditPrice(price)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
                            >
                              Düzenle
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ResponsiveTable>
            </div>

            {/* Gold Üyelik Fiyatları */}
            <div className="bg-gray-700 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4 text-yellow-400">Gold Üyelik Fiyatları</h2>
              <ResponsiveTable>
                <table className="min-w-full divide-y divide-gray-600">
                  <thead className="bg-gray-800">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Süre
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Fiyat
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Durum
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Son Güncelleme
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-700 divide-y divide-gray-600">
                    {prices.goldMembership.map((price) => (
                      <tr key={price.id} className="hover:bg-gray-650">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                          {getPriceKeyLabel(price.itemType, price.itemKey)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                          {editingPrice?.id === price.id ? (
                            <input
                              type="number"
                              value={newPrice}
                              onChange={(e) => setNewPrice(e.target.value)}
                              className="bg-gray-800 text-white border border-gray-600 rounded px-3 py-1 w-24"
                              step="0.01"
                              min="0.01"
                            />
                          ) : (
                            formatPrice(price.price)
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {editingPrice?.id === price.id ? (
                            <label className="inline-flex items-center">
                              <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                                className="rounded bg-gray-800 border-gray-600 text-pink-500 focus:ring-pink-500"
                              />
                              <span className="ml-2 text-gray-200">Aktif</span>
                            </label>
                          ) : (
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${price.isActive ? 'bg-green-800 text-green-100' : 'bg-red-800 text-red-100'}`}>
                              {price.isActive ? 'Aktif' : 'Devre Dışı'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                          {formatDate(price.updatedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                          {editingPrice?.id === price.id ? (
                            <div className="flex space-x-2">
                              <button
                                onClick={handleSavePrice}
                                disabled={saving || !newPrice || isNaN(parseFloat(newPrice)) || parseFloat(newPrice) <= 0}
                                className={`bg-pink-600 hover:bg-pink-700 text-white px-3 py-1 rounded text-xs ${(saving || !newPrice || isNaN(parseFloat(newPrice)) || parseFloat(newPrice) <= 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {saving ? 'Kaydediliyor...' : 'Kaydet'}
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded text-xs"
                              >
                                İptal
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEditPrice(price)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
                            >
                              Düzenle
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ResponsiveTable>
            </div>

            {/* Platinum Üyelik Fiyatları */}
            <div className="bg-gray-700 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4 text-blue-400">Platinum Üyelik Fiyatları</h2>
              <ResponsiveTable>
                <table className="min-w-full divide-y divide-gray-600">
                  <thead className="bg-gray-800">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Süre
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Fiyat
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Durum
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Son Güncelleme
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-700 divide-y divide-gray-600">
                    {prices.platinumMembership.map((price) => (
                      <tr key={price.id} className="hover:bg-gray-650">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                          {getPriceKeyLabel(price.itemType, price.itemKey)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                          {editingPrice?.id === price.id ? (
                            <input
                              type="number"
                              value={newPrice}
                              onChange={(e) => setNewPrice(e.target.value)}
                              className="bg-gray-800 text-white border border-gray-600 rounded px-3 py-1 w-24"
                              step="0.01"
                              min="0.01"
                            />
                          ) : (
                            formatPrice(price.price)
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {editingPrice?.id === price.id ? (
                            <label className="inline-flex items-center">
                              <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                                className="rounded bg-gray-800 border-gray-600 text-pink-500 focus:ring-pink-500"
                              />
                              <span className="ml-2 text-gray-200">Aktif</span>
                            </label>
                          ) : (
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${price.isActive ? 'bg-green-800 text-green-100' : 'bg-red-800 text-red-100'}`}>
                              {price.isActive ? 'Aktif' : 'Devre Dışı'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                          {formatDate(price.updatedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                          {editingPrice?.id === price.id ? (
                            <div className="flex space-x-2">
                              <button
                                onClick={handleSavePrice}
                                disabled={saving || !newPrice || isNaN(parseFloat(newPrice)) || parseFloat(newPrice) <= 0}
                                className={`bg-pink-600 hover:bg-pink-700 text-white px-3 py-1 rounded text-xs ${(saving || !newPrice || isNaN(parseFloat(newPrice)) || parseFloat(newPrice) <= 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {saving ? 'Kaydediliyor...' : 'Kaydet'}
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded text-xs"
                              >
                                İptal
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEditPrice(price)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
                            >
                              Düzenle
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ResponsiveTable>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 