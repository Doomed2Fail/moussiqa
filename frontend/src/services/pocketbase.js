import { readStorage, writeStorage } from './utils'
const AUTH_KEY = 'moussiqa.backend.session'
let authenticating
async function request(path, { method='GET', body, token } = {}) {
  const response = await fetch(`/api${path}`, { method, headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:token}:{})}, body:body?JSON.stringify(body):undefined, signal:AbortSignal.timeout(2500) })
  if(response.status===204)return null
  const data=await response.json()
  if(!response.ok)throw new Error(`Backend indisponible (${response.status})`)
  return data
}
async function guestSession() {
  if(authenticating)return authenticating
  authenticating=(async()=>{
    const saved=readStorage(localStorage,AUTH_KEY,null)
    if(saved?.token) {
      try {
        const data=await request('/collections/moussiqa_guests/auth-refresh',{method:'POST',token:saved.token})
        const auth={token:data.token,id:data.record.id}
        writeStorage(localStorage,AUTH_KEY,auth)
        return auth
      } catch(error) { if(error.name==='TimeoutError'||error.name==='TypeError')throw error }
    }
    const health=await request('/health')
    if(health.code!==200)throw new Error('Backend indisponible')
    const email=`${crypto.randomUUID()}@guest.moussiqa.invalid`
    const password=crypto.randomUUID()+crypto.randomUUID()
    await request('/collections/moussiqa_guests/records',{method:'POST',body:{email,password,passwordConfirm:password}})
    const data=await request('/collections/moussiqa_guests/auth-with-password',{method:'POST',body:{identity:email,password}})
    const auth={token:data.token,id:data.record.id}
    writeStorage(localStorage,AUTH_KEY,auth)
    return auth
  })().finally(()=>{authenticating=null})
  return authenticating
}
export async function loadSnapshot() {
  try {
    const auth=await guestSession()
    const data=await request('/collections/moussiqa_snapshots/records?perPage=1',{token:auth.token})
    return {available:true,payload:data.items?.[0]?.payload||null}
  } catch {return {available:false,payload:null}}
}
export async function saveSnapshot(payload) {
  try {
    const auth=await guestSession()
    const data=await request('/collections/moussiqa_snapshots/records?perPage=1',{token:auth.token})
    const id=data.items?.[0]?.id
    await request(`/collections/moussiqa_snapshots/records${id?'/'+id:''}`,{method:id?'PATCH':'POST',token:auth.token,body:{owner:auth.id,payload}})
    return true
  } catch {return false}
}
