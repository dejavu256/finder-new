'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  
  

  return (
    
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center p-4">
  <motion.div 
    className="w-full max-w-xl"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <motion.div 
      className="relative bg-white rounded-3xl p-8 shadow-xl border border-pink-200"
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="absolute -top-5 left-0 right-0 flex justify-center">
        <motion.div 
          className="bg-pink-500 text-white font-bold rounded-full p-3 w-20 h-20 flex items-center justify-center shadow-lg"
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, 0, -5, 0]
          }}
          transition={{ 
            duration: 4, 
            repeat: Infinity, 
            repeatType: "reverse" 
          }}
        >
          <span className="text-xl">💖</span>
        </motion.div>
      </div>
      
      <h1 className="text-3xl font-bold text-pink-600 mb-2 text-center mt-10">Profilinizi Tamamlayın</h1>
      <p className="text-pink-400 text-center mb-8">Mükemmel eşleşmeler için bilgilerinizi ekleyin</p>
      
      <form className="space-y-6">
        <div className="space-y-4">
          {/* Ad/Soyad */}
          <div>
            <label className="block text-pink-600 mb-2 font-medium">Ad/Soyad</label>
            <div className="relative">
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-pink-50 border-2 border-pink-300 rounded-xl text-pink-800 placeholder-pink-300 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-300"
                placeholder="Ad_Soyad"
              />
              <div className="absolute right-3 top-3 text-pink-400 text-sm bg-pink-100 px-2 py-1 rounded-lg">
                Biana_Vacker formatında
              </div>
            </div>
          </div>
          
          {/* Yaş */}
          <div>
            <label className="block text-pink-600 mb-2 font-medium">Yaş</label>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <input 
                type="number" 
                className="w-full px-4 py-3 bg-pink-50 border-2 border-pink-300 rounded-xl text-pink-800 placeholder-pink-300 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-300"
                placeholder="Yaşınız"
              />
            </motion.div>
          </div>
          
          {/* Telefon */}
          <div>
            <label className="block text-pink-600 mb-2 font-medium">Telefon Numarası</label>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <input 
                type="tel" 
                className="w-full px-4 py-3 bg-pink-50 border-2 border-pink-300 rounded-xl text-pink-800 placeholder-pink-300 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-300"
                placeholder="Telefon numaranız"
              />
            </motion.div>
          </div>
          
          {/* Kendinizi tanıtın */}
          <div>
            <label className="block text-pink-600 mb-2 font-medium">Kendinizi Tanıtın</label>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <textarea 
                className="w-full h-24 px-4 py-3 bg-pink-50 border-2 border-pink-300 rounded-xl text-pink-800 placeholder-pink-300 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-300 resize-none"
                placeholder="Kendiniz hakkında birkaç cümle yazın..."
              ></textarea>
            </motion.div>
          </div>
          
          {/* Cinsiyet */}
          <div>
            <label className="block text-pink-600 mb-2 font-medium">Cinsiyet</label>
            <div className="grid grid-cols-3 gap-3">
              {["Kadın", "Erkek", "Diğer"].map((option) => (
                <motion.div 
                  key={option}
                  className="relative" 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <input 
                    type="radio" 
                    name="gender" 
                    id={`gender-${option}`} 
                    className="peer sr-only"
                  />
                  <label 
                    htmlFor={`gender-${option}`}
                    className="flex justify-center w-full p-3 bg-pink-50 border-2 border-pink-300 rounded-xl cursor-pointer text-pink-600 peer-checked:bg-pink-200 peer-checked:border-pink-500 peer-checked:text-pink-800 hover:bg-pink-100 transition-all duration-200"
                  >
                    {option}
                  </label>
                </motion.div>
              ))}
            </div>
          </div>
          
          {/* Yönelim */}
          <div>
            <label className="block text-pink-600 mb-2 font-medium">Yönelim</label>
            <div className="grid grid-cols-3 gap-3">
              {["Kadın", "Erkek", "Diğer"].map((option) => (
                <motion.div 
                  key={`orientation-${option}`}
                  className="relative" 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <input 
                    type="radio" 
                    name="orientation" 
                    id={`orientation-${option}`} 
                    className="peer sr-only"
                  />
                  <label 
                    htmlFor={`orientation-${option}`}
                    className="flex justify-center w-full p-3 bg-pink-50 border-2 border-pink-300 rounded-xl cursor-pointer text-pink-600 peer-checked:bg-pink-200 peer-checked:border-pink-500 peer-checked:text-pink-800 hover:bg-pink-100 transition-all duration-200"
                  >
                    {option}
                  </label>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
        
        <motion.button 
          type="submit"
          className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium rounded-xl hover:from-pink-600 hover:to-purple-600 transition-all duration-300 shadow-md"
          whileHover={{ scale: 1.05, boxShadow: "0px 5px 15px rgba(236, 72, 153, 0.4)" }}
          whileTap={{ scale: 0.95 }}
        >
          Profili Tamamla
        </motion.button>
      </form>
      
      <div className="absolute -bottom-3 right-6">
        <motion.div
          animate={{ 
            y: [0, -8, 0],
            rotate: [0, 5, 0]
          }}
          transition={{ 
            duration: 3, 
            repeat: Infinity, 
            repeatType: "reverse" 
          }}
        >
          <span className="text-3xl">💕</span>
        </motion.div>
      </div>
      
      <div className="absolute -bottom-3 left-6">
        <motion.div
          animate={{ 
            y: [0, -5, 0],
            rotate: [0, -5, 0]
          }}
          transition={{ 
            duration: 2.5, 
            repeat: Infinity, 
            repeatType: "reverse", 
            delay: 0.3
          }}
        >
          <span className="text-3xl">💘</span>
        </motion.div>
      </div>
    </motion.div>
  </motion.div>
</div>

  )
}