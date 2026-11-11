import type {ImgHTMLAttributes} from 'react';
import photoVariants from './data/photo-variants.json';
const variants=photoVariants as Record<string,{width:number;height:number;srcSet:string}>;
export default function ResponsivePhoto({src,alt,sizes='(max-width:700px) 100vw, 50vw',priority=false,...props}:ImgHTMLAttributes<HTMLImageElement>&{src:string;alt:string;priority?:boolean}){
  const photo=variants[src];
  const image=<img {...props} src={src} alt={alt} width={props.width??photo?.width} height={props.height??photo?.height} loading={priority?'eager':props.loading||'lazy'} fetchPriority={priority?'high':props.fetchPriority} decoding="async"/>;
  return photo?<picture className="responsive-photo"><source type="image/webp" srcSet={photo.srcSet} sizes={sizes}/>{image}</picture>:image;
}
