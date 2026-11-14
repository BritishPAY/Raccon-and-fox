# End-to-end test: replaces the MediaPipe bundle with a fake that returns
# synthetic hand landmarks, then plays a lesson, a story quest and a full Sign Sprint.
# Run: python3 -m http.server 8765 &  then  python3 tests/e2e.py   (needs: pip install playwright)
import asyncio, json
from playwright.async_api import async_playwright
import subprocess, os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSES=json.loads(subprocess.check_output(['node', os.path.join(ROOT,'tests','dump-poses.mjs')]))
POSES_LSM=json.loads(subprocess.check_output(['node', os.path.join(ROOT,'tests','dump-poses.mjs'), 'lsm']))
URL=os.environ.get('SQ_URL','http://localhost:8765/')
FAKE="""export const FilesetResolver={forVisionTasks:async()=>({})};
export const HandLandmarker={createFromOptions:async()=>({detectForVideo:()=>({landmarks: window.__pose?[window.__pose]:[]})})};
export const FaceLandmarker={createFromOptions:async()=>({detectForVideo:()=>{const f=window.__face&&window.__face();return f?{faceBlendshapes:[{categories:Object.entries(f.blend).map(([categoryName,score])=>({categoryName,score}))}],faceLandmarks:[f.lm]}:{faceBlendshapes:[],faceLandmarks:[]};}})};"""
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=os.environ.get('CHROME_PATH') or None, args=['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'])
    pg=await b.new_page(viewport={'width':1280,'height':860})
    errs=[]; pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type=='error' and 'camera' in m.text and errs.append(m.text[:300]))
    await pg.route('**/vision_bundle.mjs', lambda r: r.fulfill(status=200, content_type='text/javascript', body=FAKE))
    await pg.add_init_script('window.__POSES='+json.dumps(POSES))
    async def show(sign, ms=1300):
      await pg.evaluate(f"window.__pose=window.__POSES['{sign}']"); await pg.wait_for_timeout(ms)
    async def nohand(ms=300):
      await pg.evaluate("window.__pose=null"); await pg.wait_for_timeout(ms)
    # wrong sign first -> coaching text
    await pg.goto(URL+'#/lesson/u1'); await pg.wait_for_timeout(1500)
    await show('B',800); print('coach while showing B for A:', await pg.inner_text('.feedback'), '|', await pg.inner_text('.seen'))
    for s in ['A','B','L','Y','I']:
      await show(s); await nohand()
    print('lesson u1:', (await pg.inner_text('.lesson-card'))[:60].replace('\n',' '))
    # quest with doubles (FOOD)
    await pg.goto(URL+'#/quest/q1'); await pg.wait_for_timeout(4000)
    for s in ['F','O','O','D']: await show(s,1400)
    await nohand(2500)
    for s in ['C','O','W']: await show(s,1400)
    await nohand(2500)
    for s in ['M','I','L','K']: await show(s,1400)
    await nohand(2500)
    await show('ILY',1400); await nohand(3000)
    print('quest:', (await pg.inner_text('.chat-col'))[-120:].replace('\n',' '))
    # sprint: follow target
    await pg.goto(URL+'#/sprint?seed=7&vs=900&from=Ksenia'); await pg.wait_for_timeout(1500)
    await pg.click('#go')
    
    for i in range(140):
      if await pg.is_visible('.sprint-end'): break
      t=(await pg.inner_text('.target .lname')).strip().split(' ')[-1]
      await pg.evaluate(f"window.__pose=window.__POSES['{t}']"); await pg.wait_for_timeout(450)
    await pg.wait_for_timeout(1500)
    print('sprint:', (await pg.inner_text('.sprint-end'))[:120].replace('\n',' '))
    await pg.goto(URL+'#/badges'); await pg.wait_for_timeout(800)
    print('badges:', (await pg.inner_text('.stat-row')).replace('\n',' '))
    # fist family lesson (S T N M X) — the hardest group
    await pg.goto(URL+'#/lesson/u4'); await pg.wait_for_timeout(1500)
    for s in ['S','T','N','M','X']:
      await show(s); await nohand()
    print('lesson u4:', (await pg.inner_text('.lesson-card'))[:40].replace('\n',' '))
    # sideways & down (G H Q P)
    await pg.goto(URL+'#/lesson/u5'); await pg.wait_for_timeout(1500)
    for s in ['G','H','Q','P']:
      await show(s); await nohand()
    print('lesson u5:', (await pg.inner_text('.lesson-card'))[:40].replace('\n',' '))
    # "Teach it my hand": a near-miss L (here: a D shape) is not accepted by the rules;
    # after 8 s the learner records it once and from then on it counts
    await pg.goto(URL+'#/lesson/u1'); await pg.wait_for_timeout(1500)
    for s in ['A','B']:
      await show(s); await nohand()
    await show('D', 9500)
    teach_visible = await pg.is_visible('.teach')
    await pg.click('.teach'); await pg.wait_for_timeout(1800)
    await nohand(300); await show('D', 1500)
    print('teach:', teach_visible, '| card now:', (await pg.inner_text('.sign-label')).strip())
    await pg.evaluate("localStorage.removeItem('signify:personal:v1')")

    # Spanish interface + Mexican Sign Language
    await pg.goto(URL+'#/learn'); await pg.wait_for_timeout(800)
    await pg.click('#settings [data-ui=es]'); await pg.wait_for_timeout(300)
    await pg.click('#settings [data-sl=lsm]'); await pg.wait_for_timeout(500)
    print('LSM path:', (await pg.inner_text('.page-title')), '|', ' / '.join([await h.inner_text() for h in await pg.query_selector_all('.unit h3')]))
    await pg.evaluate('window.__POSES='+json.dumps(POSES_LSM))
    await pg.goto(URL+'#/lesson/u2'); await pg.wait_for_timeout(1500)
    await show('B',800); print('coach (ES):', await pg.inner_text('.feedback'))
    for s in ['U','V','W','R','H']:
      await show(s); await nohand()
    print('LSM lesson u2:', (await pg.inner_text('.lesson-card'))[:45].replace('\n',' '))
    await pg.goto(URL+'#/lesson/u5'); await pg.wait_for_timeout(1500)
    for s in ['G','P']:
      await show(s); await nohand()
    print('LSM lesson u5:', (await pg.inner_text('.lesson-card'))[:45].replace('\n',' '))
    await pg.goto(URL+'#/'); await pg.wait_for_timeout(600)
    print('home ES:', (await pg.inner_text('.hero-text'))[:120].replace('\n',' '))
    # daily warm-up + culture face drills + progress page (LSM, Spanish)
    await pg.goto(URL+'#/'); await pg.wait_for_timeout(600)
    print('today card:', (await pg.inner_text('.today'))[:140].replace('\n',' | '))
    await pg.goto(URL+'#/daily'); await pg.wait_for_timeout(1500)
    for i in range(14):
      if 'done-card' in (await pg.inner_html('.lesson-card')): break
      cur = (await pg.inner_text('.sign-label')).strip()
      word = await pg.query_selector('.word .cur')
      if word: cur = (await word.inner_text()).strip()
      await show(cur, 1300)
    await pg.wait_for_timeout(1200)
    print('daily:', (await pg.inner_text('.lesson-card'))[:160].replace('\n',' | '))
    await pg.goto(URL+'#/culture'); await pg.wait_for_timeout(800)
    await pg.evaluate('''() => { window.__t0 = performance.now(); window.__face = () => { const t=(performance.now()-window.__t0)/1000; const up=t>1.2; const lm=[]; lm[1]={x:0.5}; lm[234]={x:0}; lm[454]={x:1}; return {lm, blend:{browInnerUp: up?0.7:0.05, browOuterUpLeft: up?0.6:0.05, browOuterUpRight: up?0.6:0.05, browDownLeft:0.1, browDownRight:0.1}}; }; }''')
    await pg.click('.drill-btns [data-drill=raise]'); await pg.wait_for_timeout(3500)
    print('face raise:', await pg.inner_text('#drill-fb'), await pg.evaluate("import('/js/camera.js').then(m=>({on:m.camera.faceOn, fl:!!m.camera.faceLandmarker, run:m.camera.running, st:m.camera.status, lis:m.camera.listeners.size}))"))
    await pg.evaluate('''() => { window.__t0 = performance.now(); window.__face = () => { const t=(performance.now()-window.__t0)/1000; const lm=[]; lm[1]={x:0.5+0.12*Math.sin(t*9)}; lm[234]={x:0}; lm[454]={x:1}; return {lm, blend:{browInnerUp:0.05,browOuterUpLeft:0.05,browOuterUpRight:0.05,browDownLeft:0.1,browDownRight:0.1}}; }; }''')
    await pg.click('.drill-btns [data-drill=shake]'); await pg.wait_for_timeout(3500)
    print('face shake:', await pg.inner_text('#drill-fb'))
    await pg.goto(URL+'#/badges'); await pg.wait_for_timeout(700)
    print('league:', (await pg.inner_text('.league-row'))[:150].replace('\n',' | '))
    async with pg.expect_download() as dl:
      await pg.click('#share-progress')
    print('share card file:', (await dl.value).suggested_filename)
    print('errors', errs)
    await b.close()
asyncio.run(main())
