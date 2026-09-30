const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'}).catch(async()=>chromium.launch());
const p=await b.newPage({viewport:{width:1280,height:720}});
await p.goto('file://'+process.cwd()+'/video.html');await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(500);
const fps=30,T=29;require('fs').mkdirSync('f',{recursive:true});
const only=process.argv[2];
if(only){for(const t of only.split(',')){await p.evaluate(t=>render(+t),t);await p.screenshot({path:`t${t}.png`})}}
else for(let i=0;i<fps*T;i++){await p.evaluate(t=>render(t),i/fps);await p.screenshot({path:`f/${String(i).padStart(4,'0')}.jpg`,type:'jpeg',quality:93})}
await b.close()})()
