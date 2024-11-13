import React from 'react';

const DynamicBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden -z-10 bg-gradient-to-br from-purple-100 to-pink-100">
      {/* Grands cercles animés avec plus d'opacité */}
      <div className="absolute rounded-full -top-24 -left-24 w-96 h-96 bg-purple-500/40 mix-blend-multiply filter blur-xl animate-pulse-slow" />
      <div className="absolute rounded-full top-1/2 -right-24 w-96 h-96 bg-pink-500/40 mix-blend-multiply filter blur-xl animate-pulse" />
      <div className="absolute rounded-full -bottom-24 left-1/3 w-96 h-96 bg-purple-600/40 mix-blend-multiply filter blur-xl animate-pulse-slow" />
      
      {/* Cercles moyens plus vifs */}
      <div className="absolute w-64 h-64 rounded-full top-1/4 right-1/4 bg-pink-400/50 mix-blend-multiply filter blur-lg animate-pulse" />
      <div className="absolute w-64 h-64 rounded-full bottom-1/3 left-1/4 bg-purple-400/50 mix-blend-multiply filter blur-lg animate-pulse-slow" />
      
      {/* Petits cercles d'accent */}
      <div className="absolute w-32 h-32 rounded-full top-1/3 left-1/2 bg-purple-300/60 mix-blend-multiply filter blur-md animate-pulse" />
      <div className="absolute w-32 h-32 rounded-full bottom-1/4 right-1/3 bg-pink-300/60 mix-blend-multiply filter blur-md animate-pulse-slow" />
      
      {/* Effet de brillance supplémentaire */}
      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-purple-200/20 to-transparent animate-pulse" />
      
      {/* Pattern plus visible */}
      <div className="absolute inset-0 opacity-20" 
           style={{
             backgroundImage: `radial-gradient(circle at 1px 1px, purple 1px, transparent 0)`,
             backgroundSize: '24px 24px'
           }} 
      />
    </div>
  );
};

export default DynamicBackground;