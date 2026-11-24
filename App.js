import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Access, api, alertError, bdt, Btn, Busy, Chips, Collection, color, Content, dateText, Deletion, enablePush, ErrorBox, Field,
  Picture, s, statusText, Title, useActive, useNotificationOpen, usePage, useSession } from './common';

const cartKey='cod.cart';
const langKey='cod.language';
const attemptKey='cod.order-attempt';
const language=(a,b,bn)=>bn&&b?b:a;
const itemTitle=(p,bn)=>language(p.title,p.title_bn,bn);
const toMoney=(n,bn)=>bdt(n,bn);
const unit=p=>p.discount_price??p.price;
const sale=p=>p.discount_price!==null&&Number(p.discount_price)<Number(p.price);

function Item({p,bn,open,add}) {
  return <View style={[s.card,{flex:1,marginHorizontal:4,minWidth:0,maxWidth:'49%'}]}>
    <Pressable accessibilityRole="button" onPress={()=>open(p.id)}>
      <Picture uri={p.image}/>
      <Text style={[s.label,{marginTop:8}]} numberOfLines={2}>{itemTitle(p,bn)}</Text>
    </Pressable>
    <Prices p={p} bn={bn}/>
    <Btn title={p.stock>0?language('Add to cart','কার্টে যোগ করুন',bn):language('Sold out','স্টক নেই',bn)} disabled={p.stock<=0} onPress={()=>add(p)}/>
  </View>;
}
function Prices({p,bn}) {
  return <View style={s.row}>
    <Text style={{color:color.green,fontWeight:'800',fontSize:17}}>{bdt(unit(p),bn)}</Text>
    {sale(p)&&<Text style={[s.muted,{textDecorationLine:'line-through'}]}>{bdt(p.price,bn)}</Text>}
    {sale(p)&&Number(p.price)>0&&<Text style={{color:color.red,fontWeight:'700'}}>−{Math.floor(100*(Math.round(Number(p.price)*100)-Math.round(Number(unit(p))*100))/Math.round(Number(p.price)*100))}%</Text>}
  </View>;
}
function Catalog({tab,bn,home,homeError,reloadHome,initialShop,open,add}) {
  const t=(a,b)=>language(a,b,bn);
  const [search,setSearch]=useState('');
  const [q,setQ]=useState('');
  const [category,setCategory]=useState('');
  const [sort,setSort]=useState('');
  const [featured,setFeatured]=useState(false);
  useEffect(()=>{const id=setTimeout(()=>setQ(search.trim()),280);return()=>clearTimeout(id);},[search]);
  const page=usePage('products',{q,category,sort,featured:featured?'1':'',flash:tab==='Flash'?'1':'',shop:initialShop?.id});
  const allCats=home?.categories||[];
  const showHome=tab==='Home'&&!category&&!q&&!sort&&!featured&&!initialShop;
  const optionList=[{id:'',label:t('All categories','সব বিভাগ')},...allCats.map(p=>({id:String(p.id),label:language(p.name,p.name_bn,bn)}))];
  const hostLink=path=>{
    const origin='https://www.cod.com.bd';
    try {
      const target=new URL(path,origin);
      if(target.origin!==origin&&target.origin!=='https://cod.com.bd') throw new Error(t('Link unavailable','লিংকটি পাওয়া যাচ্ছে না'));
      Linking.openURL(target.toString()).catch(e=>alertError(e,bn));
    } catch(e){alertError(e,bn);}
  };
  const header=<>
    <Title>{initialShop?.name||({Home:t('Shop COD Bangladesh','সিওডি বাংলাদেশে কেনাকাটা'),Categories:t('Categories','বিভাগ'),Flash:t('Flash sale','ফ্ল্যাশ সেল')})[tab]}</Title>
    <Field label={t('Search products','পণ্য খুঁজুন')} value={search} onChangeText={setSearch} returnKeyType="search" onSubmitEditing={()=>setQ(search.trim())}/>
    {homeError&&<ErrorBox error={homeError} retry={reloadHome} bn={bn}/>}
    {showHome&&<View style={[s.card,{backgroundColor:color.pale}]}>
      <Text style={{color:color.green,fontSize:22,fontWeight:'900'}}>{t('Pay when your order arrives','পণ্য হাতে পেলেই দাম দিন')}</Text>
      <Text style={s.muted}>{t('Cash on delivery across Bangladesh','সারা বাংলাদেশে ক্যাশ অন ডেলিভারি')}</Text>
    </View>}
    {showHome && home?.banners.length>0&&<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
      {home.banners.map((p,i)=><Pressable key={i} accessibilityRole="link" style={{width:280}} onPress={()=>hostLink(p.link_path)}>
        <Picture uri={p.image} style={{aspectRatio:2.3}}/><Text numberOfLines={1} style={s.label}>{itemTitle(p,bn)}</Text>
      </Pressable>)}</ScrollView>}
    <Chips options={optionList} value={category} onChange={setCategory}/>
    <Chips options={[{id:'',label:t('Newest','নতুন')},{id:'low',label:t('Lowest price','কম দাম')},{id:'high',label:t('Highest price','বেশি দাম')}]}
      value={sort} onChange={setSort}/>
    {tab==='Home'&&home?.featured.length>0&&<Btn title={featured?t('Show all products','সব পণ্য দেখুন'):t('Featured products','নির্বাচিত পণ্য')}
      secondary onPress={()=>setFeatured(!featured)}/>}
    {showHome&&home?.flash.length>0&&<View>
      <Title>{t('Flash sale','ফ্ল্যাশ সেল')}</Title>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        {home.flash.slice(0,8).map(p=><Pressable accessibilityRole="button" style={[s.card,{width:145}]} key={p.id} onPress={()=>open(p.id)}>
          <Picture uri={p.image}/><Text numberOfLines={1} style={s.label}>{itemTitle(p,bn)}</Text><Prices p={p} bn={bn}/>
        </Pressable>)}
      </ScrollView>
    </View>}
  </>;
  const combined={...page,refresh:()=>{page.refresh();reloadHome();}};
  return <Collection page={combined} columns={2} header={header} bn={bn} empty={t('No matching products','মিল আছে এমন পণ্য পাওয়া যায়নি')}
    more={t('Load more','আরও দেখুন')} renderItem={({item})=><Item p={item} bn={bn} open={open} add={add}/>}/>;
}
function Product({id,bn,open,shop,add,buy}) {
  const t=(a,b)=>language(a,b,bn);
  const [p,setP]=useState(null);
  const [error,setError]=useState(null);
  const [revision,reload]=useState(0);
  const [image,setImage]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    setError(null);setP(null);setImage(0);
    api('product_detail',{params:{id},signal:controller.signal}).then(result=>{
      if(!controller.signal.aborted)setP(result);
    }).catch(e=>{if(!controller.signal.aborted)setError(e);});
    return ()=>controller.abort();
  },[id,revision]);
  if(error)return <Content><ErrorBox error={error} retry={()=>reload(x=>x+1)} bn={bn}/></Content>;
  if(!p)return <Busy/>;
  return <Content>
    <Picture uri={p.images[image]||p.image} style={{maxHeight:425}}/>
    {p.images.length>1&&<ScrollView horizontal contentContainerStyle={s.chips}>
      {p.images.map((uri,i)=><Pressable key={i} accessibilityRole="button" accessibilityLabel={t('Photo','ছবি')+' '+(i+1)}
        accessibilityState={{selected:i===image}} style={{width:60,borderColor:i===image?color.green:color.line,borderWidth:2,borderRadius:10}}
        onPress={()=>setImage(i)}><Picture uri={uri}/></Pressable>)}
    </ScrollView>}
    <View style={s.card}>
      <Title>{itemTitle(p,bn)}</Title><Prices p={p} bn={bn}/>
      <Text style={s.muted}>{p.stock>0?t('In stock','স্টকে আছে'):t('Out of stock','স্টক নেই')}</Text>
      {p.variants.length>0&&<><Text style={s.label}>{t('Options','অপশন')}</Text>
        <Chips options={p.variants.map(v=>({id:v.id,label:t(v.label_en,v.label_bn)}))} value={p.id} onChange={open}/></>}
      <Btn title={t('Add to cart','কার্টে যোগ করুন')} disabled={p.stock<=0} secondary onPress={()=>add(p)}/>
      <Btn title={t('Buy now · COD','এখনই কিনুন · ক্যাশ অন ডেলিভারি')} disabled={p.stock<=0} onPress={()=>buy(p)}/>
    </View>
    {p.description!==''&&<View style={s.card}><Text style={s.text}>{p.description}</Text></View>}
    <View style={s.card}><Text style={s.label}>{p.shop.name}</Text>
      <Btn title={t('Visit store','দোকান দেখুন')} onPress={()=>shop(p.shop)} secondary/></View>
  </Content>;
}
function Cart({cart,change,bn,go,open,attempt}) {
  const t=(a,b)=>language(a,b,bn);
  const subtotal=cart.reduce((sum,p)=>sum+Math.round(Number(unit(p))*100)*p.qty,0)/100;
  return <Content><Title>{t('Your cart','আপনার কার্ট')}</Title>
    {attempt&&<Btn title={t('Recover last checkout','শেষ চেকআউট খুঁজুন')} secondary onPress={()=>go('Recovery')}/>}
    {!cart.length&&<Text style={s.muted}>{t('Your cart is empty.','আপনার কার্ট খালি।')}</Text>}
    {cart.map(p=><View style={s.card} key={p.id}>
      <Pressable accessibilityRole="button" style={s.row} onPress={()=>open(p.id)}>
        <Picture uri={p.image} style={{width:60}}/><Text style={[s.label,{flex:1}]}>{itemTitle(p,bn)}</Text>
      </Pressable>
      <Text style={s.text}>{toMoney(Math.round(Number(unit(p))*100)*p.qty/100,bn)}</Text>
      <View style={s.row}>
        <Btn title="−" secondary disabled={p.qty<=1} onPress={()=>change(p,p.qty-1)}/>
        <Text style={s.label}>{p.qty}</Text>
        <Btn title="+" secondary disabled={p.qty>=999} onPress={()=>change(p,p.qty+1)}/>
        <Btn title={t('Remove','সরান')} danger onPress={()=>change(p,0)}/>
      </View>
    </View>)}
    <Text style={s.label}>{t('Estimated subtotal','আনুমানিক পণ্যমূল্য')} · {bdt(subtotal,bn)}</Text>
    {cart.length>0&&<Btn title={t('COD checkout','ক্যাশ অন ডেলিভারি চেকআউট')} disabled={Boolean(attempt)} onPress={()=>go('Checkout')}/>}
  </Content>;
}
function Checkout({cart,session,bn,onReceipt,remember,attempt,forget,recovery=false}) {
  const t=(a,b)=>language(a,b,bn);
  const [areas,setAreas]=useState([]);
  const [area,setArea]=useState('dhaka');
  const [form,setForm]=useState({name:session?.name||'',phone:'',address:'',district:'',email:''});
  const [quote,setQuote]=useState(null);
  const [error,setError]=useState(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [revision,reload]=useState(0);
  const locking=useRef(false);
  const token=session?.token;
  const items=JSON.stringify(cart.map(({id,qty})=>({id,qty})));
  const district=area==='dhaka'?'':form.district.trim();
  useEffect(()=>{
    if(recovery)return;
    const controller=new AbortController();
    api('checkout_cod',{signal:controller.signal}).then(r=>{if(!controller.signal.aborted)setAreas(r.areas);})
      .catch(e=>{if(!controller.signal.aborted)setError(e);});
    return ()=>controller.abort();
  },[revision,recovery]);
  useEffect(()=>{
    if(recovery)return;
    const controller=new AbortController();
    setQuote(null);setError(null);setLoading(true);
    const timer=setTimeout(()=>{
      api('checkout_cod',{token,body:{action:'quote',items:JSON.parse(items),area,district},signal:controller.signal})
        .then(r=>{if(!controller.signal.aborted)setQuote(r);}).catch(e=>{if(!controller.signal.aborted)setError(e);})
        .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    },280);
    return ()=>{clearTimeout(timer);controller.abort();};
  },[token,items,area,district,revision,recovery]);
  async function recover() {
    if(locking.current||!attempt)return;
    locking.current=true;setBusy(true);setError(null);
    try {
      const r=await api('checkout_cod',{token:attempt.signedIn?token:undefined,body:{action:'receipt',key:attempt.key}});
      await onReceipt(r.orders);
    } catch(e){setError(e);}
    finally{locking.current=false;setBusy(false);}
  }
  async function place() {
    if(locking.current||!quote||attempt)return;
    locking.current=true;setBusy(true);setError(null);
    try {
      const key=Array.from(await Crypto.getRandomBytesAsync(32), x=>x.toString(16).padStart(2,'0')).join('');
      await remember({key,signedIn:Boolean(token),created:Date.now()});
      try {
        const r=await api('checkout_cod',{token,body:{...form,district,area,items:JSON.parse(items),action:'place',version:quote.version,key}});
        await onReceipt(r.orders);
      } catch(e) {
        if([401,403,409,422,429].includes(e.status)) await forget();
        if(e.status===409) reload(n=>n+1);
        throw e;
      }
    } catch(e){setError(e);}
    finally{locking.current=false;setBusy(false);}
  }
  if(recovery||attempt)return <Content><Title>{t('Recover checkout','চেকআউট খুঁজুন')}</Title>
    <Text style={s.text}>{t('Check whether your last order reached COD Bangladesh. Sign in with the same account if you were signed in at checkout.','আপনার শেষ অর্ডার পৌঁছেছে কি না দেখুন। চেকআউটের সময় সাইন ইন করে থাকলে একই অ্যাকাউন্টে সাইন ইন করুন।')}</Text>
    {error&&<ErrorBox error={error} bn={bn}/>}
    <Btn title={t('Check order receipt','অর্ডারের রসিদ দেখুন')} disabled={busy||!attempt} onPress={recover}/>
    {error?.status===404&&Date.now()-(attempt?.created??0)<120000&&<Text style={s.muted}>{t('Wait two minutes after your last checkout attempt, then check the receipt again.','শেষ চেকআউটের দুই মিনিট পরে আবার রসিদ দেখুন।')}</Text>}
    {error?.status===404&&Date.now()-(attempt?.created??0)>=120000&&<Btn title={t('Return to cart checkout','কার্ট চেকআউটে ফিরুন')} secondary disabled={busy} onPress={forget}/>}
  </Content>;
  const f=(key,label,props={})=><Field label={label} value={form[key]} editable={!busy}
    onChangeText={value=>setForm(old=>({...old,[key]:value}))} {...props}/>;
  return <Content><Title>{t('Cash on delivery','ক্যাশ অন ডেলিভারি')}</Title>
    <Text style={s.label}>{t('Delivery area','ডেলিভারি এলাকা')}</Text>
    <Chips options={areas.map(a=>({id:a.id,label:t(a.en,a.bn)}))} value={area} onChange={id=>{if(!busy)setArea(id);}}/>
    {area==='outside'&&f('district',t('District','জেলা'))}
    {f('name',t('Full name','পুরো নাম'))}
    {f('phone',t('Bangladesh mobile','বাংলাদেশি মোবাইল নম্বর'),{keyboardType:'phone-pad'})}
    {f('address',t('Street address, neighbourhood and upazila','ঠিকানা, মহল্লা ও উপজেলা'),{multiline:true})}
    {f('email',t('Email (optional)','ইমেইল (ঐচ্ছিক)'),{keyboardType:'email-address',autoCapitalize:'none'})}
    {loading&&<Busy/>}
    {error&&<ErrorBox error={error} retry={()=>reload(x=>x+1)} bn={bn}/>}
    {quote&&<View style={s.card}>
      <Text style={s.text}>{t('Subtotal','পণ্যমূল্য')} · {bdt(quote.subtotal,bn)}</Text>
      <Text style={s.text}>{t('Delivery','ডেলিভারি')} · {bdt(quote.delivery,bn)}</Text>
      <Text style={s.label}>{t('Pay on delivery','ডেলিভারির সময় পরিশোধ')} · {bdt(quote.total,bn)}</Text>
    </View>}
    <Btn title={t('Place COD order','ক্যাশ অন ডেলিভারি অর্ডার করুন')} disabled={busy||loading||!quote||!areas.length||
      !form.name.trim()||!form.phone.trim()||!form.address.trim()||(area==='outside'&&!district)} onPress={place}/>
  </Content>;
}
function Account({auth,bn,reference}) {
  const t=(a,b)=>language(a,b,bn);
  const [id,setId]=useState(reference||'');
  const [phone,setPhone]=useState('');
  const [track,setTrack]=useState(null);
  const [trackedQuery,setTrackedQuery]=useState(null);
  const [error,setError]=useState(null);
  const [busy,setBusy]=useState(false);
  useEffect(()=>{if(reference)setId(reference);},[reference]);
  useEffect(()=>{
    if(!trackedQuery)return;
    const controller=new AbortController();
    const timer=setInterval(()=>{
      api('track_order',{body:trackedQuery,token:auth.session?.token,signal:controller.signal})
        .then(order=>{if(!controller.signal.aborted){setTrack(order);setError(null);}})
        .catch(e=>{if(!controller.signal.aborted)setError(e);});
    },45000);
    return ()=>{clearInterval(timer);controller.abort();};
  },[trackedQuery,auth.session?.token]);
  async function lookup() {
    setBusy(true);setError(null);setTrack(null);setTrackedQuery(null);
    const query={reference:id,phone};
    try {
      setTrack(await api('track_order',{body:query,token:auth.session?.token}));
      setTrackedQuery(query);
    } catch(e){setError(e);}
    finally{setBusy(false);}
  }
  async function push() {
    try {
      const yes=await enablePush('auth',auth.session.token);
      Alert.alert(yes?t('Order updates enabled','অর্ডার আপডেট চালু হয়েছে'):t('Notification permission is off','নোটিফিকেশন অনুমতি বন্ধ'));
    } catch(e){alertError(e,bn);}
  }
  return <Content><View style={s.card}><Title>{t('Track an order','অর্ডার ট্র্যাক করুন')}</Title>
    <Field label={t('Order ID','অর্ডার আইডি')} value={id} onChangeText={setId} autoCapitalize="characters" maxLength={20}/>
    <Field label={t('Mobile used at checkout','চেকআউটের মোবাইল নম্বর')} value={phone} onChangeText={setPhone} keyboardType="phone-pad"/>
    <Btn title={track?t('Refresh status','স্ট্যাটাস আপডেট করুন'):t('Track order','অর্ডার দেখুন')} disabled={busy||id.trim().length!==20} onPress={lookup}/>
    {error&&<ErrorBox error={error} bn={bn}/>}
    {track&&<View style={s.card}>
      <Text style={s.label}>{statusText(track.status,bn)} · {bdt(track.total,bn)}</Text>
      {!!track.tracking_number&&<Text style={s.text}>{t('Courier tracking','কুরিয়ার ট্র্যাকিং')} · {track.tracking_number}</Text>}
      {track.events.map((event,i)=><View key={i} style={s.row}>
        <Text style={s.label}>● {statusText(event.status,bn)}</Text><Text style={s.muted}>{dateText(event.occurred_at,bn)}</Text>
      </View>)}
    </View>}
  </View>
  {!auth.session?<Access role="customer" bn={bn} onLogin={auth.save}/>:<View style={s.card}>
    <Title>{auth.session.name}</Title>
    <Btn title={t('Enable order notifications','অর্ডার নোটিফিকেশন চালু করুন')} onPress={push} secondary/>
    <Btn title={t('Sign out','সাইন আউট')} onPress={()=>auth.logout().catch(e=>alertError(e,bn))} secondary/>
    <Deletion endpoint="auth" bn={bn} token={auth.session.token} onDeleted={()=>auth.save(null)}/>
  </View>}
  </Content>;
}
function Marketplace() {
  const auth=useSession('auth');
  const [ready,setReady]=useState(false);
  const [bn,setBn]=useState(false);
  const [cart,setCart]=useState([]);
  const [attempt,setAttempt]=useState(null);
  const [receipt,setReceipt]=useState([]);
  const [reference,setReference]=useState('');
  const [tab,setTab]=useState('Home');
  const [stack,setStack]=useState([]);
  const [home,setHome]=useState(null);
  const [homeError,setHomeError]=useState(null);
  const [homeVersion,setHomeVersion]=useState(0);
  const t=(a,b)=>language(a,b,bn);
  const reloadHome=useCallback(()=>setHomeVersion(v=>v+1),[]);
  useActive(reloadHome);
  useEffect(()=>{
    Promise.all([AsyncStorage.getItem(cartKey),AsyncStorage.getItem(langKey),SecureStore.getItemAsync(attemptKey),AsyncStorage.getItem('cod.receipt')]).then(([list,lang,last,savedReceipt])=>{
      if(list)setCart(JSON.parse(list));
      setBn(lang==='bn');
      if(last)setAttempt(JSON.parse(last));
      if(savedReceipt)setReceipt(JSON.parse(savedReceipt));
    }).catch(alertError).finally(()=>setReady(true));
  },[]);
  useEffect(()=>{
    if(!ready)return;
    AsyncStorage.setItem(cartKey,JSON.stringify(cart)).catch(e=>alertError(e,bn));
  },[cart,ready]);
  useEffect(()=>{
    const controller=new AbortController();
    setHomeError(null);
    api('home',{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setHome(data);}).catch(e=>{if(!controller.signal.aborted)setHomeError(e);});
    return ()=>controller.abort();
  },[homeVersion]);
  const back=useCallback(()=>{if(!stack.length)return false;setStack(old=>old.slice(0,-1));return true;},[stack.length]);
  useEffect(()=>{const sub=BackHandler.addEventListener('hardwareBackPress',back);return()=>sub.remove();},[back]);
  const select=useCallback(next=>{setTab(next);setStack([]);},[]);
  const onPush=useCallback(screen=>{if(screen==='Track')select('Track');},[select]);
  useNotificationOpen(onPush);
  const go=(key,extra={})=>setStack(old=>[...old,{key,...extra}]);
  const open=id=>go('Product',{id});
  const top=stack[stack.length-1];
  const current=top?.key||tab;
  const count=cart.reduce((sum,p)=>sum+p.qty,0);
  function toggle() {
    const next=!bn;setBn(next);
    AsyncStorage.setItem(langKey,next?'bn':'en').catch(e=>alertError(e,bn));
  }
  function change(p,qty) {
    if(attempt) {
      Alert.alert(t('Recover your last checkout first','আগের চেকআউট আগে খুঁজুন'));
      return;
    }
    if(qty>999)return;
    if(qty>0&&!cart.some(item=>item.id===p.id)&&cart.length>=100) {
      Alert.alert(t('Your cart can hold up to 100 different products','কার্টে সর্বোচ্চ ১০০ ধরনের পণ্য রাখা যাবে'));
      return;
    }
    if(qty>(cart.find(item=>item.id===p.id)?.qty??0)&&qty>p.stock) {
      Alert.alert(t('Requested quantity unavailable','এই পরিমাণ স্টকে নেই'));
      return;
    }
    setCart(old=>qty===0?old.filter(item=>item.id!==p.id):old.some(item=>item.id===p.id)
      ?old.map(item=>item.id===p.id?{...p,qty}:item):[...old,{...p,qty}]);
  }
  function add(p) {
    const qty=(cart.find(item=>item.id===p.id)?.qty??0)+1;
    if(qty>p.stock) {Alert.alert(t('Requested quantity unavailable','এই পরিমাণ স্টকে নেই'));return;}
    change(p,qty);
  }
  async function remember(value) {
    const pending={...value,cart:!top?.direct};
    await SecureStore.setItemAsync(attemptKey,JSON.stringify(pending));
    setAttempt(pending);
  }
  async function forget() {
    await SecureStore.deleteItemAsync(attemptKey);
    setAttempt(null);
  }
  async function confirm(orders) {
    await AsyncStorage.setItem('cod.receipt',JSON.stringify(orders));
    if(attempt?.cart??!top?.direct) {
      await AsyncStorage.setItem(cartKey,'[]');
      setCart([]);
    }
    setReceipt(orders);
    await forget();
    setStack([{key:'Receipt'}]);
    reloadHome();
  }
  const tabs=[
    ['Home','⌂',t('Home','হোম')],['Categories','▤',t('Categories','বিভাগ')],
    ['Flash','ϟ',t('Flash sale','ফ্ল্যাশ সেল')],['Cart','▣',t('Cart','কার্ট')],['Track','◎',t('Account','অ্যাকাউন্ট')],
  ];
  let screen;
  if(!auth.ready||!ready) screen=<Busy/>;
  else if(current==='Product') screen=<Product id={top.id} bn={bn} open={id=>setStack(old=>[...old.slice(0,-1),{key:'Product',id}])}
    shop={shop=>go('Shop',{shop})} add={add} buy={p=>attempt?go('Recovery'):go('Checkout',{direct:[{...p,qty:1}]})}/>;
  else if(current==='Cart') screen=<Cart cart={cart} change={change} bn={bn} go={go} open={open} attempt={attempt}/>;
  else if(current==='Checkout'||current==='Recovery') screen=<Checkout key={current} cart={top.direct||cart} session={auth.session} bn={bn}
    onReceipt={confirm} remember={remember} attempt={attempt} forget={async()=>{await forget();if(current==='Recovery')select('Cart');}} recovery={current==='Recovery'}/>;
  else if(current==='Receipt') screen=<Content><Title>{t('Order confirmed','অর্ডার নিশ্চিত')}</Title>
    {receipt.map(o=><View key={o.reference} style={s.card}>
      <Text style={s.label}>{o.shop_name||'COD.com.bd'}</Text>
      <Text selectable style={s.text}>{t('Order ID','অর্ডার আইডি')} · {o.reference}</Text>
      <Text style={s.text}>{t('Pay on delivery','ডেলিভারির সময় পরিশোধ')} · {bdt(o.total,bn)}</Text>
      <Btn title={t('Track this order','এই অর্ডার ট্র্যাক করুন')} secondary onPress={()=>{setReference(o.reference);select('Track');}}/>
    </View>)}
    <Btn title={t('Continue shopping','কেনাকাটা চালিয়ে যান')} onPress={()=>select('Home')}/>
  </Content>;
  else if(current==='Track') screen=<Account auth={auth} bn={bn} reference={reference}/>;
  else screen=<Catalog key={current+String(top?.shop?.id??'')} tab={current==='Shop'?'Categories':tab} bn={bn} home={home}
    homeError={homeError} reloadHome={reloadHome} initialShop={top?.shop} open={open} add={add}/>;
  return <SafeAreaView style={s.screen}>
    <View style={s.header}>
      {top&&<Btn title={t('‹ Back','‹ ফিরুন')} onPress={back} secondary/>}
      <Text style={s.logo}>COD.com.bd</Text>
      {receipt.length>0&&!top&&<Btn title={t('Receipt','রসিদ')} secondary onPress={()=>go('Receipt')}/>}
      <Btn title={bn?'EN':'বাংলা'} onPress={toggle} secondary/>
    </View>
    <View style={{flex:1}}>{screen}</View>
    {!top&&<View style={{flexDirection:'row',backgroundColor:color.white,borderTopColor:color.line,borderTopWidth:1}}>
      {tabs.map(([key,icon,label])=><Pressable key={key} accessibilityRole="tab" accessibilityState={{selected:tab===key}}
        onPress={()=>select(key)} style={{flex:1,minHeight:53,alignItems:'center',justifyContent:'center',backgroundColor:tab===key?color.pale:color.white}}>
        <Text style={{color:color.green,fontWeight:'800',fontSize:18}}>{icon}{key==='Cart'&&count>0?' '+count:''}</Text>
        <Text numberOfLines={1} style={{fontSize:11,color:color.ink,fontWeight:tab===key?'800':'500'}}>{label}</Text>
      </Pressable>)}
    </View>}
  </SafeAreaView>;
}
export default function App() {return <SafeAreaProvider><Marketplace/></SafeAreaProvider>;}
