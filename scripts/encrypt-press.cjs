const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const sourcePath=path.resolve(root,process.argv[2]||'private/press/article.json');
const password=process.env.HIGHST_PRESS_PASSWORD;
if(!password)throw Error('Set HIGHST_PRESS_PASSWORD before encrypting the Press article.');
const article=JSON.parse(fs.readFileSync(sourcePath,'utf8'));
if(!article.title||!Array.isArray(article.paragraphs)||!article.paragraphs.length)throw Error('Missing article content');
article.photo='data:image/jpeg;base64,'+fs.readFileSync(path.resolve(path.dirname(sourcePath),article.photoPath)).toString('base64');
delete article.photoPath;
for(const figure of article.inlineFigures||[]){
 if(!Number.isInteger(figure.afterParagraph)||figure.afterParagraph<1||figure.afterParagraph>article.paragraphs.length)throw Error('Invalid inline figure position');
 const figurePath=path.resolve(path.dirname(sourcePath),figure.imagePath);
 const mime={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg'}[path.extname(figurePath).toLowerCase()];
 if(!mime)throw Error('Unsupported inline figure format');
 figure.image='data:'+mime+';base64,'+fs.readFileSync(figurePath).toString('base64');
 delete figure.imagePath;
}
const salt=crypto.randomBytes(16),iv=crypto.randomBytes(12),iterations=310000;
const key=crypto.pbkdf2Sync(password,salt,iterations,32,'sha256');
const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
const plaintext=Buffer.from(JSON.stringify(article));
const encrypted=Buffer.concat([cipher.update(plaintext),cipher.final(),cipher.getAuthTag()]);
const payload={version:1,iterations,salt:salt.toString('base64'),iv:iv.toString('base64'),data:encrypted.toString('base64')};
const output=path.join(root,'assets/press/article.enc.json');
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(payload)+'\n');
console.log('Encrypted Press article and photograph: '+encrypted.length+' bytes');
