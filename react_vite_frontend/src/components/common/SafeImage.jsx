import React from 'react';
import { DOMAIN } from "../../api/apiAxios";

const SafeImage = ({ src, alt, type = 'lawyer', className = '', ...props }) => {

  const config = {
    lawyer: {
      folder: 'lawyer_avatars',
      defaultFile: 'default-avatar2.png'
    },
    customer: {
      folder: 'customer_avatars',
      defaultFile: 'default-avatar3.png'
    }
  };

  const { folder, defaultFile } = config[type] || config.lawyer;

  const DEFAULT_PATH = `${DOMAIN}/asset/${folder}/${defaultFile}`;

  const getSource = () => {
    if (!src) return DEFAULT_PATH;
    if (src.startsWith('blob:') || src.startsWith('data:') || src.startsWith('http')) return src;

    const cleanSrc = src.includes(folder) ? src : `${folder}/${src}`;
    return `${DOMAIN}/storage/${cleanSrc}`;
  };

  return (
    <img
      {...props}
      src={getSource()}
      alt={alt || 'Avatar'}
      className={className}
      onError={(e) => {
        e.target.onerror = null; 
        e.target.src = DEFAULT_PATH; 
      }}
    />
  );
};

export default SafeImage;