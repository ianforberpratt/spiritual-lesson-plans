import math, struct, wave, random
SR=32000; T=29.0; N=int(SR*T)
random.seed(4)
L=[0.0]*N; R=[0.0]*N
def hz(m): return 440*2**((m-69)/12)
def add(buf,t0,d,f,amp,kind,pan=0.5):
    i0=int(t0*SR); n=int(d*SR)
    for k in range(n):
        i=i0+k
        if i>=N: break
        t=k/SR
        if kind=='pluck':
            env=math.exp(-t*2.6)*min(1,t*200)
            v=math.sin(2*math.pi*f*t)+.35*math.sin(4*math.pi*f*t)*math.exp(-t*5)+.12*math.sin(6*math.pi*f*t)*math.exp(-t*8)
        else:
            a=min(1,t/1.2); r=min(1,(d-t)/1.5); env=a*max(0,r)
            v=math.sin(2*math.pi*f*t)+.25*math.sin(4*math.pi*f*t+.3)+.15*math.sin(2*math.pi*f*1.004*t)
        s=v*env*amp
        buf[0][i]+=s*(1-pan); buf[1][i]+=s*pan
B=(L,R)
# chords: (start, root midi bass, arpeggio notes)
C=lambda r,*iv:[r+x for x in iv]
prog=[(0,48,C(60,0,4,7,12)),(3.6,43,C(55,0,4,7,12)),(7.2,45,C(57,0,3,7,12)),
      (10.8,50,C(62,0,3,7,12)),(16.2,41,C(53,0,4,7,12)),(20.4,43,C(55,0,4,7,14)),(24.6,48,C(60,0,4,7,12,16))]
ends=[p[0] for p in prog[1:]]+[T]
step=0.45
for (s,bass,arp),e in zip(prog,ends):
    d=e-s+1.5
    add(B,s,d,hz(bass),.16,'pad',.5); add(B,s,d,hz(bass+12),.07,'pad',.35)
    for n in arp[1:3]: add(B,s,d,hz(n-12+12),.045,'pad',.65)
    k=0;t=s+0.2
    while t<e-0.05:
        n=arp[[0,1,2,3,2,1,2,1][k%8]]
        add(B,t,2.2,hz(n),.15,'pluck',0.3+0.4*((k%3)/2)); t+=step;k+=1
# simple reverb: comb delays
def comb(x,ms,g):
    dl=int(SR*ms/1000);y=x[:]
    for i in range(dl,N): y[i]+=y[i-dl]*g
    return y
out=[]
for ch,ms in ((L,(37,53,71)),(R,(41,59,79))):
    wet=[0.0]*N
    for m in ms:
        c=comb(ch,m*4,.55)
        wet=[a+b*.33 for a,b in zip(wet,c)]
    out.append([a*.75+b*.6 for a,b in zip(ch,wet)])
pk=max(max(abs(v) for v in o) for o in out)
g=.85/pk
w=wave.open('music.wav','wb');w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR)
fi=2.0;fo=3.0
fr=bytearray()
for i in range(N):
    t=i/SR;e=min(1,t/fi,(T-t)/fo) if True else 1
    e=max(0,e)
    fr+=struct.pack('<hh',int(out[0][i]*g*e*32000),int(out[1][i]*g*e*32000))
w.writeframes(bytes(fr));w.close()
