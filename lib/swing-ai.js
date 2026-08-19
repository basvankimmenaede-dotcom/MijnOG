const MODEL_URL='https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
const WASM_URL='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm'

let landmarkerPromise=null

async function getLandmarker(){
  if(!landmarkerPromise){
    landmarkerPromise=(async()=>{
      const {FilesetResolver,PoseLandmarker}=await import('@mediapipe/tasks-vision')
      const vision=await FilesetResolver.forVisionTasks(WASM_URL)
      return PoseLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:MODEL_URL},runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:.45,minPosePresenceConfidence:.45,minTrackingConfidence:.45})
    })()
  }
  return landmarkerPromise
}

const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v))
const mid=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:((a.z||0)+(b.z||0))/2,visibility:Math.min(a.visibility??1,b.visibility??1)})
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)
const angle=(a,b,c)=>{const ab={x:a.x-b.x,y:a.y-b.y},cb={x:c.x-b.x,y:c.y-b.y};const den=Math.hypot(ab.x,ab.y)*Math.hypot(cb.x,cb.y);if(!den)return 0;return Math.acos(clamp((ab.x*cb.x+ab.y*cb.y)/den,-1,1))*180/Math.PI}
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0
const std=a=>{const m=mean(a);return Math.sqrt(mean(a.map(v=>(v-m)**2)))}
const scoreRange=(value,idealLow,idealHigh,falloff)=>value<idealLow?clamp(100-(idealLow-value)/falloff*55):value>idealHigh?clamp(100-(value-idealHigh)/falloff*55):92
const visOf=(lm,idxs)=>mean(idxs.map(i=>lm[i]?.visibility??0))

function waitEvent(el,event){return new Promise((resolve,reject)=>{const ok=()=>{cleanup();resolve()};const bad=()=>{cleanup();reject(new Error('Video kon niet worden gelezen.'))};const cleanup=()=>{el.removeEventListener(event,ok);el.removeEventListener('error',bad)};el.addEventListener(event,ok,{once:true});el.addEventListener('error',bad,{once:true})})}
async function seek(video,t){if(Math.abs(video.currentTime-t)<.002)return;video.currentTime=t;await waitEvent(video,'seeked')}

export async function analyzeSwingVideo(file,onProgress=()=>{}){
  if(!file) throw new Error('Kies eerst een video.')
  onProgress({progress:3,label:'AI-model laden…'})
  const detector=await getLandmarker()
  const url=URL.createObjectURL(file)
  const video=document.createElement('video')
  video.src=url;video.muted=true;video.playsInline=true;video.preload='auto'
  try{
    await waitEvent(video,'loadedmetadata')
    const duration=Math.min(Number(video.duration)||0,20)
    if(!duration||duration<.6) throw new Error('De video is te kort om betrouwbaar te analyseren.')
    const targetSamples=Math.max(30,Math.min(72,Math.round(duration*8)))
    const frames=[]
    for(let i=0;i<targetSamples;i++){
      const t=(duration-.02)*(i/(targetSamples-1))
      await seek(video,t)
      const result=detector.detectForVideo(video,Math.round(t*1000))
      const lm=result?.landmarks?.[0]
      if(lm?.length>=33) frames.push({t,lm})
      if(i%3===0) onProgress({progress:8+Math.round((i/(targetSamples-1))*68),label:`Lichaam volgen… ${i+1}/${targetSamples}`})
    }
    if(frames.length<Math.max(15,targetSamples*.45)) throw new Error('Ik kan het lichaam niet betrouwbaar genoeg volgen. Film opnieuw met het hele lichaam duidelijk in beeld, bij voorkeur van opzij.')
    onProgress({progress:80,label:'Swingfasen herkennen…'})
    const metrics=deriveMetrics(frames,duration)
    onProgress({progress:94,label:'Feedback en oefeningen bepalen…'})
    await new Promise(r=>setTimeout(r,80))
    onProgress({progress:100,label:'Analyse gereed'})
    return metrics
  } finally { URL.revokeObjectURL(url); video.removeAttribute('src'); video.load() }
}

function deriveMetrics(frames,duration){
  const usable=frames.map((f,i)=>{
    const l=f.lm
    const shoulder=mid(l[11],l[12]), hip=mid(l[23],l[24]), wrist=mid(l[15],l[16])
    const ankleL=l[27],ankleR=l[28], kneeL=l[25],kneeR=l[26]
    const scale=Math.max(.04,dist(shoulder,hip))
    return {...f,i,shoulder,hip,wrist,ankleL,ankleR,kneeL,kneeR,scale,poseVis:visOf(l,[0,11,12,15,16,23,24,25,26,27,28])}
  })
  const speeds=usable.map((f,i)=>i?dist(f.wrist,usable[i-1].wrist)/Math.max(.001,f.t-usable[i-1].t)/f.scale:0)
  const smooth=speeds.map((_,i)=>mean(speeds.slice(Math.max(0,i-1),Math.min(speeds.length,i+2))))
  const searchStart=Math.floor(usable.length*.2), searchEnd=Math.max(searchStart+2,Math.floor(usable.length*.9))
  let contactIdx=searchStart
  for(let i=searchStart;i<searchEnd;i++) if(smooth[i]>smooth[contactIdx]) contactIdx=i
  const baseCount=Math.max(3,Math.floor(usable.length*.15))
  const baseL=mean(usable.slice(0,baseCount).map(f=>f.ankleL.x)), baseR=mean(usable.slice(0,baseCount).map(f=>f.ankleR.x))
  const moveL=Math.max(...usable.slice(0,contactIdx+1).map(f=>Math.abs(f.ankleL.x-baseL)))
  const moveR=Math.max(...usable.slice(0,contactIdx+1).map(f=>Math.abs(f.ankleR.x-baseR)))
  const frontIsLeft=moveL>=moveR
  const ankle=f=>frontIsLeft?f.ankleL:f.ankleR, knee=f=>frontIsLeft?f.kneeL:f.kneeR, hipFront=f=>frontIsLeft?f.lm[23]:f.lm[24]
  const baseFront=frontIsLeft?baseL:baseR
  let plantIdx=Math.max(2,Math.floor(contactIdx*.45))
  let maxDisp=-1
  for(let i=2;i<contactIdx;i++){const d=Math.abs(ankle(usable[i]).x-baseFront);if(d>maxDisp){maxDisp=d;plantIdx=i}}
  const launchThreshold=Math.max(.45,smooth[contactIdx]*.22)
  let launchIdx=Math.max(plantIdx,contactIdx-1)
  for(let i=plantIdx;i<=contactIdx;i++){if(smooth[i]>=launchThreshold){launchIdx=i;break}}
  const startIdx=Math.max(0,plantIdx-Math.max(4,Math.floor(usable.length*.18)))
  const finishIdx=Math.min(usable.length-1,contactIdx+Math.max(3,Math.floor(usable.length*.12)))
  const active=usable.slice(startIdx,finishIdx+1), preContact=usable.slice(startIdx,contactIdx+1)
  const avgScale=mean(preContact.map(f=>f.scale))
  const headPts=preContact.map(f=>f.lm[0]);const headX=headPts.map(p=>p.x/avgScale), headY=headPts.map(p=>p.y/avgScale)
  const headMotion=Math.hypot(Math.max(...headX)-Math.min(...headX),Math.max(...headY)-Math.min(...headY))
  const headScore=clamp(98-headMotion*75)
  const strideNorm=Math.abs(ankle(usable[plantIdx]).x-baseFront)/avgScale
  const plantSettle=plantIdx>1?Math.abs(ankle(usable[Math.min(contactIdx,plantIdx+2)]).x-ankle(usable[plantIdx]).x)/avgScale:0
  const strideScore=clamp(scoreRange(strideNorm,.28,.82,.35)-plantSettle*35)
  const torsoAngles=active.map(f=>Math.atan2(f.shoulder.x-f.hip.x,f.hip.y-f.shoulder.y)*180/Math.PI)
  const postureVariation=std(torsoAngles)
  const postureScore=clamp(96-postureVariation*4.1)
  const cf=usable[Math.min(contactIdx,usable.length-1)]
  const frontKneeAngle=angle(hipFront(cf),knee(cf),ankle(cf))
  const frontFootDrift=Math.abs(ankle(usable[finishIdx]).x-ankle(usable[plantIdx]).x)/avgScale
  const frontScore=clamp(scoreRange(frontKneeAngle,145,178,25)-frontFootDrift*55)
  const finish=usable[finishIdx], minAx=Math.min(finish.ankleL.x,finish.ankleR.x),maxAx=Math.max(finish.ankleL.x,finish.ankleR.x)
  const stance=Math.max(.03,maxAx-minAx), balanceOffset=finish.hip.x<minAx?(minAx-finish.hip.x)/stance:finish.hip.x>maxAx?(finish.hip.x-maxAx)/stance:0
  const balanceScore=clamp(96-balanceOffset*90-frontFootDrift*22)
  const plantToContact=Math.max(.001,usable[contactIdx].t-usable[plantIdx].t), launchDelay=Math.max(0,usable[launchIdx].t-usable[plantIdx].t)
  const timingRatio=launchDelay/plantToContact
  const timingScore=scoreRange(timingRatio,.05,.50,.38)
  const hipSpeed=usable.map((f,i)=>i?dist(f.hip,usable[i-1].hip)/Math.max(.001,f.t-usable[i-1].t)/f.scale:0)
  const shoulderSpeed=usable.map((f,i)=>i?dist(f.shoulder,usable[i-1].shoulder)/Math.max(.001,f.t-usable[i-1].t)/f.scale:0)
  const onset=(arr,from,to)=>{const peak=Math.max(...arr.slice(from,to+1));const th=peak*.28;for(let i=from;i<=to;i++)if(arr[i]>=th)return i;return from}
  const hipOn=onset(hipSpeed,Math.max(1,startIdx),contactIdx), shoulderOn=onset(shoulderSpeed,Math.max(1,startIdx),contactIdx), wristOn=onset(smooth,Math.max(1,startIdx),contactIdx)
  const dt=Math.max(.001,usable[contactIdx].t-usable[startIdx].t)
  const seqGap1=(usable[shoulderOn].t-usable[hipOn].t)/dt, seqGap2=(usable[wristOn].t-usable[shoulderOn].t)/dt
  const sequencingScore=clamp(82 + (seqGap1>0?8:-18) + (seqGap2>0?8:-18) - Math.max(0,Math.abs(seqGap1)-.35)*45 - Math.max(0,Math.abs(seqGap2)-.35)*45)
  const connection=usable.slice(launchIdx,contactIdx+1).map(f=>dist(f.wrist,f.shoulder)/f.scale)
  const connectionVar=std(connection)
  const handScore=clamp(94-connectionVar*38)
  const detectionRate=frames.length/Math.max(frames.length,Math.round(duration*8))
  const baseConfidence=clamp(mean(active.map(f=>f.poseVis))*100,0,100)
  const confidences={
    head_stability:Math.round(clamp(mean(preContact.map(f=>visOf(f.lm,[0,11,12,23,24])))*100)),
    stride:Math.round(clamp(mean(preContact.map(f=>visOf(f.lm,[27,28,31,32])))*100)),
    posture:Math.round(clamp(mean(active.map(f=>visOf(f.lm,[11,12,23,24])))*100)),
    front_side:Math.round(clamp(mean(active.map(f=>visOf(f.lm,frontIsLeft?[23,25,27]:[24,26,28])))*100)),
    balance:Math.round(clamp(mean(active.map(f=>visOf(f.lm,[23,24,27,28])))*100)),
    load_timing:Math.round(clamp(baseConfidence*.92)),
    sequencing:Math.round(clamp(baseConfidence*.78)),
    hand_connection:Math.round(clamp(mean(active.map(f=>visOf(f.lm,[11,12,15,16,23,24])))*88))
  }
  const metrics={head_stability:Math.round(headScore),stride:Math.round(strideScore),posture:Math.round(postureScore),front_side:Math.round(frontScore),balance:Math.round(balanceScore),load_timing:Math.round(timingScore),sequencing:Math.round(sequencingScore),hand_connection:Math.round(handScore)}
  const weighted=Object.entries(metrics).filter(([k])=>confidences[k]>=45)
  const overall=Math.round(weighted.reduce((s,[k,v])=>s+v*(confidences[k]/100),0)/Math.max(.01,weighted.reduce((s,[k])=>s+confidences[k]/100,0)))
  return {metrics,confidences,overall,meta:{engine:'mediapipe_pose_v1',sample_count:frames.length,duration_seconds:Number(duration.toFixed(2)),pose_confidence:Math.round(baseConfidence),front_side:frontIsLeft?'left':'right',phase_times:{plant:Number(usable[plantIdx].t.toFixed(2)),launch:Number(usable[launchIdx].t.toFixed(2)),contact_proxy:Number(usable[contactIdx].t.toFixed(2)),finish:Number(usable[finishIdx].t.toFixed(2))},measurements:{stride_body_units:Number(strideNorm.toFixed(2)),front_knee_angle:Number(frontKneeAngle.toFixed(1)),head_motion_body_units:Number(headMotion.toFixed(2)),posture_variation_deg:Number(postureVariation.toFixed(1))}}}
}
