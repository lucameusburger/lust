import { NextResponse } from 'next/server';
import fs from 'fs';
import imageSize from 'image-size'; // Corrected import
import path from 'path';

interface ApiImageData {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export async function GET() {
  try {
    const imagesDirectory = path.join(process.cwd(), 'public/images');
    const imageFiles = fs.readdirSync(imagesDirectory).filter(file =>
      file.toLowerCase().endsWith('.png')
    );

    const imagesData: ApiImageData[] = imageFiles.map(file => {
      const filePath = path.join(imagesDirectory, file);
      const fileBuffer = fs.readFileSync(filePath); // Read file into a buffer
      const dimensions = imageSize(fileBuffer); // Pass buffer to imageSize
      const altText = file.substring(0, file.lastIndexOf('.')).replace(/[_-]/g, ' ');

      if (!dimensions || typeof dimensions.width === 'undefined' || typeof dimensions.height === 'undefined') {
        console.warn(`Could not get dimensions for image: ${file}`);
        return {
          src: `/images/${file}`,
          alt: altText,
          width: 256, // Default width if dimensions are not found
          height: 256, // Default height if dimensions are not found
        };
      }

      return {
        src: `/images/${file}`,
        alt: altText,
        width: dimensions.width,
        height: dimensions.height,
      };
    });

    return NextResponse.json(imagesData);
  } catch (error) {
    console.error('Error fetching images:', error);
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
  }
} 