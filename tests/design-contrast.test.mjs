import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';

const palette=await readFile(new URL('../app/brand-palette.css',import.meta.url),'utf8');
const light=palette.split('html[data-theme=dark]')[0];
const rgb=hex=>{const expanded=hex.length===3?[...hex].map(s=>s+s).join(''):hex;return [0,2,4].map(i=>parseInt(expanded.slice(i,i+2),16)/255);};
const token=(source,name)=>rgb(source.match(new RegExp(`--${name}:#([0-9a-f]+);`,'i'))[1]);
const luminance=rgb=>rgb.map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const[x,y]=[luminance(a),luminance(b)].sort((a,b)=>a-b);return(y+.05)/(x+.05);};

test('shared light and dark text colors clear normal-text AA contrast on their base surfaces',()=>{
 const forest=token(light,'brand-forest'),white=token(light,'brand-white'),paper=token(light,'brand-paper');
 for(const background of [white,paper])for(const foreground of [token(light,'ink'),token(light,'muted')])assert(contrast(foreground,background)>=4.5);
 for(const background of [forest,token(light,'brand-forest-dark')])assert(contrast(white,background)>=4.5);
 const dark=palette.slice(palette.indexOf('html[data-theme=dark]'));
 const surface=token(dark,'brand-white'),black=token(dark,'brand-paper');
 for(const background of [surface,black,token(dark,'page-background')])for(const foreground of [token(dark,'ink'),token(dark,'muted')])assert(contrast(foreground,background)>=4.5);
 for(const background of [token(dark,'accent'),token(dark,'accent-hover')])assert(contrast(token(dark,'accent-ink'),background)>=4.5);
});
