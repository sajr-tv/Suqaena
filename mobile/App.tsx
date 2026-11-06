import React, { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Image, ImageBackground, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collections, Collection } from './src/collections';

type Tab = 'Discover' | 'Collections' | 'Saved' | 'Bag';
const countries = ['UAE', 'Saudi Arabia', 'Oman', 'Qatar', 'Kuwait', 'Bahrain'];
const key = 'suqaena.preferences.v1';
export default function App() { return <SafeAreaProvider><Store /></SafeAreaProvider>; }
function Store() {
  const [tab, setTab] = useState<Tab>('Discover');
  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState<string[]>([]);
  const [country, setCountry] = useState('UAE');
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [detail, setDetail] = useState<Collection | null>(null);
  const [regionOpen, setRegionOpen] = useState(false);
  useEffect(() => { let active = true; AsyncStorage.getItem(key).then(raw => {
    if (!raw || !active) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.saved)) setSaved(data.saved.filter((id: unknown) => collections.some(c => c.id === id)));
    if (countries.includes(data.country)) setCountry(data.country);
  }).catch(() => { if (active) setStorageError('Saved preferences could not be loaded.'); }).finally(() => { if (active) setReady(true); }); return () => { active = false; }; }, []);
  useEffect(() => { if (ready) AsyncStorage.setItem(key, JSON.stringify({saved, country})).catch(() => setStorageError('Your preferences could not be saved on this device.')); }, [saved, country, ready]);
  useEffect(() => { const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
    if (detail) { setDetail(null); return true; }
    if (tab !== 'Discover') { setTab('Discover'); return true; }
    return false;
  }); return () => subscription.remove(); }, [tab, detail]);
  const toggle = (id: string) => setSaved(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  const visible = collections.filter(c => (tab !== 'Saved' || saved.includes(c.id)) && c.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  if (!ready) return <SafeAreaView style={s.loading}><ActivityIndicator color="#801c35" /><Text>Opening SUQAENA…</Text></SafeAreaView>;
  return <SafeAreaView style={s.shell}>
    <View style={s.header}><View><Text style={s.monogram}>SQ</Text><Text style={s.wordmark}>SUQAENA</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Choose your region" onPress={() => setRegionOpen(true)} style={s.region}><Text style={s.regionText}>{country} ⌄</Text></Pressable></View>
    <ScrollView key={tab} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Text style={s.eyebrow}>PAKISTANI STYLE · A WORLD OF ELEGANCE</Text>
      {!!storageError && <Text accessibilityRole="alert" style={s.notice}>{storageError}</Text>}
      {tab === 'Discover' && <>
        <ImageBackground source={require('./assets/hero.jpg')} style={s.hero} imageStyle={s.heroImage} accessibilityLabel="SUQAENA red embroidered fashion collection"><View style={s.heroCaption}><Text style={s.heroTitle}>Elegance, in every detail.</Text><Pressable accessibilityRole="button" style={s.goldButton} onPress={() => setTab('Collections')}><Text style={s.buttonText}>EXPLORE COLLECTIONS →</Text></Pressable></View></ImageBackground>
        <Text style={s.heading}>Discover your next look</Text><Text style={s.subtitle}>Curated inspiration. Timeless style.</Text>
      </>}
      {tab === 'Bag' ? <View style={s.empty}><Text style={s.emptyIcon}>♧</Text><Text style={s.heading}>Your shopping bag</Text><Text style={s.subtitle}>Shopping is coming soon. Products, prices and delivery options will appear once our inventory is confirmed.</Text><Text style={s.notice}>Checkout and cash on delivery are not available yet.</Text><Pressable accessibilityRole="button" style={s.goldButton} onPress={() => setTab('Collections')}><Text style={s.buttonText}>EXPLORE COLLECTIONS</Text></Pressable></View> : <>
        {tab !== 'Discover' && <Text style={s.heading}>{tab === 'Saved' ? 'Your saved inspiration' : 'Explore collections'}</Text>}
        <TextInput style={s.search} accessibilityLabel="Search collections" placeholder="Search collections and designer looks" placeholderTextColor="#817775" value={query} onChangeText={setQuery} clearButtonMode="while-editing" returnKeyType="search" />
        {visible.length === 0 && <View style={s.empty}><Text style={s.heading}>{tab === 'Saved' && !query ? 'Keep what inspires you' : 'No matching collections'}</Text><Text style={s.subtitle}>{tab === 'Saved' && !query ? 'Tap the heart on a collection to save it here.' : 'Try another collection or designer name.'}</Text></View>}
        <View style={s.grid}>{visible.map(item => <View key={item.id} style={s.card}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Explore ${item.name}`} onPress={() => setDetail(item)}><Image source={item.image} style={s.cardImage} resizeMode="cover" /><Text style={s.group}>{item.group}</Text><Text style={s.cardTitle}>{item.name}</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`${saved.includes(item.id) ? 'Unsave' : 'Save'} ${item.name}`} accessibilityState={{selected: saved.includes(item.id)}} onPress={() => toggle(item.id)} style={s.heart}><Text style={s.heartText}>{saved.includes(item.id) ? '♥' : '♡'}</Text></Pressable>
        </View>)}</View>
      </>}
      <View style={s.footer}><Text style={s.wordmark}>SUQAENA</Text><Text style={s.subtitle}>Women's clothing · UAE & GCC</Text><Text style={s.small}>Collection preview · Ordering is not yet enabled.</Text><Pressable accessibilityRole="link" onPress={() => Linking.openURL('https://suqaena.com').catch(() => setStorageError('The website could not be opened. Please try again.'))}><Text style={s.link}>Visit suqaena.com ↗</Text></Pressable></View>
    </ScrollView>
    <View style={s.tabs}>{(['Discover','Collections','Saved','Bag'] as Tab[]).map((name, i) => <Pressable key={name} accessibilityRole="tab" accessibilityState={{selected: tab === name}} onPress={() => {setQuery('');setTab(name);}} style={s.tab}><Text style={[s.tabIcon, tab === name && s.active]}>{['⌂','▦','♡','♧'][i]}</Text><Text style={[s.tabLabel, tab === name && s.active]}>{name}{name === 'Saved' && saved.length ? ` (${saved.length})` : ''}</Text></Pressable>)}</View>
    <Modal visible={!!detail} animationType="slide" onRequestClose={() => setDetail(null)}><SafeAreaView style={s.shell}><Pressable accessibilityRole="button" onPress={() => setDetail(null)} style={s.close}><Text style={s.link}>← Back to collections</Text></Pressable>{detail && <ScrollView contentContainerStyle={s.content}><Image source={detail.image} style={s.detailImage} resizeMode="contain" /><Text style={s.eyebrow}>{detail.group}</Text><Text style={s.heading}>{detail.name}</Text><Text style={s.subtitle}>Explore the mood of this collection. Individual products, sizes, prices and availability are being prepared.</Text><Text style={s.notice}>Inspiration preview. No products are available to order yet.</Text><Pressable accessibilityRole="button" style={s.goldButton} onPress={() => toggle(detail.id)}><Text style={s.buttonText}>{saved.includes(detail.id) ? '♥ SAVED · TAP TO REMOVE' : '♡ SAVE THIS COLLECTION'}</Text></Pressable></ScrollView>}</SafeAreaView></Modal>
    <Modal visible={regionOpen} transparent animationType="fade" onRequestClose={() => setRegionOpen(false)}><View style={s.overlay}><View style={s.sheet}><Text style={s.heading}>Your region</Text><Text style={s.subtitle}>Choose your browsing preference. Delivery availability will be confirmed before ordering opens.</Text>{countries.map(value => <Pressable accessibilityRole="radio" accessibilityState={{checked:country === value}} key={value} style={s.country} onPress={() => {setCountry(value);setRegionOpen(false);}}><Text style={s.cardTitle}>{value}</Text><Text>{country === value ? '●' : '○'}</Text></Pressable>)}<Pressable accessibilityRole="button" onPress={() => setRegionOpen(false)} style={s.close}><Text style={s.link}>Close</Text></Pressable></View></View></Modal>
  </SafeAreaView>;
}
const s = StyleSheet.create({
 shell:{flex:1,backgroundColor:'#fffdfb'},loading:{flex:1,alignItems:'center',justifyContent:'center',gap:16},header:{paddingHorizontal:22,paddingVertical:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderColor:'#ebdfd3'},monogram:{fontFamily:Platform.OS==='ios'?'Georgia':'serif',fontSize:32,color:'#b39148',letterSpacing:-5},wordmark:{fontFamily:Platform.OS==='ios'?'Georgia':'serif',fontSize:17,letterSpacing:4,color:'#701b30'},region:{padding:12},regionText:{color:'#701b30',fontSize:12},content:{padding:18,paddingBottom:28,maxWidth:760,width:'100%',alignSelf:'center'},eyebrow:{fontSize:10,letterSpacing:2,color:'#8a704b',marginBottom:16,marginTop:6},hero:{height:360,justifyContent:'flex-end',marginBottom:26},heroImage:{borderRadius:8},heroCaption:{padding:18,backgroundColor:'#541226b3',borderBottomLeftRadius:8,borderBottomRightRadius:8},heroTitle:{color:'#fff',fontSize:29,fontFamily:Platform.OS==='ios'?'Georgia':'serif',marginBottom:16},goldButton:{backgroundColor:'#d8bc7d',padding:17,alignItems:'center',borderRadius:3,marginTop:10},buttonText:{color:'#471425',fontSize:11,fontWeight:'700',letterSpacing:1},heading:{fontFamily:Platform.OS==='ios'?'Georgia':'serif',fontSize:27,color:'#701b30',marginBottom:10},subtitle:{fontSize:14,color:'#746864',lineHeight:22,marginBottom:14},search:{borderWidth:1,borderColor:'#dfd3c7',borderRadius:5,paddingHorizontal:14,paddingVertical:14,marginVertical:16,color:'#341b22',backgroundColor:'#fff',fontSize:13},grid:{flexDirection:'row',flexWrap:'wrap',gap:14},card:{width:'47.7%',marginBottom:12,position:'relative'},cardImage:{width:'100%',aspectRatio:0.73,borderRadius:6,backgroundColor:'#efe4d5'},group:{fontSize:9,color:'#927649',letterSpacing:1,marginTop:10,textTransform:'uppercase'},cardTitle:{fontSize:14,color:'#5b2634',marginTop:5,lineHeight:20},heart:{position:'absolute',right:7,top:7,backgroundColor:'#fffffff2',borderRadius:25,width:44,height:44,alignItems:'center',justifyContent:'center'},heartText:{fontSize:25,color:'#801c35'},tabs:{flexDirection:'row',borderTopWidth:1,borderColor:'#e7d9c9',backgroundColor:'#fff'},tab:{flex:1,paddingVertical:10,alignItems:'center',minHeight:58},tabIcon:{fontSize:23,color:'#897d77'},tabLabel:{fontSize:10,color:'#897d77',marginTop:3},active:{color:'#801c35',fontWeight:'700'},empty:{paddingVertical:40,alignItems:'center'},emptyIcon:{fontSize:50,color:'#b39148',marginBottom:18},notice:{padding:14,backgroundColor:'#f6ede4',color:'#795b47',fontSize:12,lineHeight:20,marginBottom:14},footer:{paddingTop:32,marginTop:22,borderTopWidth:1,borderColor:'#e7d9c9',alignItems:'center',gap:7},small:{fontSize:11,color:'#8d8179',textAlign:'center'},link:{color:'#801c35',paddingVertical:12,fontSize:13},close:{paddingHorizontal:20,paddingVertical:8},detailImage:{width:'100%',height:400,marginBottom:22},overlay:{flex:1,backgroundColor:'#28131b99',justifyContent:'center',padding:24},sheet:{backgroundColor:'#fffdfb',padding:22,borderRadius:10,maxWidth:500,width:'100%',alignSelf:'center'},country:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:13,borderBottomWidth:1,borderColor:'#eee2d5'}
});
