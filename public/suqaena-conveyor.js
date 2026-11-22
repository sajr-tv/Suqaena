(async function(){
  const groups=[
    {id:'suqaena-saree-track',urls:['/shop?category=Ready-to-Wear&type=sarees','/shop?category=Sarees']},
    {id:'suqaena-lawn-track',urls:['/shop/unstitched/lawn','/shop?category=Embroidered%20Lawn%20and%20Chiffon']},
    {id:'suqaena-stitched-track',urls:['/shop?category=Ready-to-Wear&type=three-piece','/shop?category=Ready-to-Wear','/shop/ready-to-wear']},
    {id:'suqaena-unstitched-track',urls:['/shop/unstitched/chiffon','/shop/unstitched/lawn','/shop/unstitched/cotton','/shop/unstitched/silk','/shop?category=Unstitched%202-Piece%20and%203-Piece%20Suits']}
  ];
  async function load(url,products){
    try{
      const response=await fetch(url,{credentials:'same-origin'});
      if(!response.ok)return;
      const doc=new DOMParser().parseFromString(await response.text(),'text/html');
      for(const card of doc.querySelectorAll('article.fashion-card,article.product-card,.product-card')){
        const link=card.querySelector('a.fashion-image[href],a[href^="/shop/dress/"],a[href^="/shop/product/"]');
        const img=link?.querySelector('img')||card.querySelector('img');
        const title=card.querySelector('h2,h3')?.textContent?.trim()||img?.alt?.trim();
        const href=link?.getAttribute('href'),src=img?.getAttribute('src');
        if(!href||!src||!title||products.has(href))continue;
        if(!href.startsWith('/shop/dress/')&&!href.startsWith('/shop/product/'))continue;
        products.set(href,{href,src:new URL(src,location.origin).href,title});
      }
    }catch(error){console.warn('SUQAENA collection unavailable',url,error)}
  }
  function makeCard(product,duplicate){
    const link=document.createElement('a');link.className='suqaena-conveyor-card';link.href=product.href;
    if(duplicate){link.setAttribute('aria-hidden','true');link.tabIndex=-1}
    const img=document.createElement('img');img.src=product.src;img.alt=product.title;img.loading='lazy';img.addEventListener('error',()=>{link.remove();console.warn('SUQAENA skipped unavailable product image',product.href)});
    const name=document.createElement('strong');name.textContent=product.title;link.append(img,name);return link;
  }
  function enableSwipe(track){
    const viewport=track.parentElement;
    viewport.style.touchAction='pan-y';
    viewport.style.cursor='grab';
    let active=null,suppressClick=false;
    viewport.addEventListener('pointerdown',event=>{
      if(event.pointerType==='mouse'&&event.button!==0)return;
      const animation=track.getAnimations().find(a=>a.effect&&a.playState!=='finished');
      if(!animation)return;
      active={id:event.pointerId,x:event.clientX,last:event.clientX,moved:false,animation};
      animation.pause();viewport.style.cursor='grabbing';
    });
    viewport.addEventListener('pointermove',event=>{
      if(!active||event.pointerId!==active.id)return;
      const delta=event.clientX-active.last;
      if(Math.abs(event.clientX-active.x)>7)active.moved=true;
      if(!active.moved)return;
      if(event.pointerType==='mouse'&&!viewport.hasPointerCapture(event.pointerId))viewport.setPointerCapture(event.pointerId);
      const duration=active.animation.effect.getTiming().duration;
      const distance=track.scrollWidth/2;
      if(Number.isFinite(duration)&&distance>0){
        const current=Number(active.animation.currentTime)||0;
        active.animation.currentTime=((current-delta/distance*duration)%duration+duration)%duration;
      }
      active.last=event.clientX;
    });
    const finish=event=>{
      if(!active||event.pointerId!==active.id)return;
      suppressClick=active.moved;
      active.animation.play();active=null;viewport.style.cursor='grab';
      if(viewport.hasPointerCapture(event.pointerId))viewport.releasePointerCapture(event.pointerId);
    };
    viewport.addEventListener('pointerup',finish);
    viewport.addEventListener('pointercancel',finish);
    viewport.addEventListener('click',event=>{
      if(suppressClick){event.preventDefault();event.stopPropagation();suppressClick=false;}
    },true);
  }
  await Promise.all(groups.map(async group=>{
    const track=document.getElementById(group.id);if(!track)return;
    const products=new Map();
    for(const url of group.urls)await load(url,products);
    if(!products.size){track.textContent='Dresses are being updated. Select Shop Collection to browse.';track.style.animation='none';return}
    const items=[...products.values()];
    for(const product of items)track.append(makeCard(product,false));
    if(items.length>1){for(const product of items)track.append(makeCard(product,true));track.style.animationDuration=Math.max(45,items.length*5)+'s'}
    else track.style.animation='none';
    if(items.length>1)enableSwipe(track);
  }));
})();