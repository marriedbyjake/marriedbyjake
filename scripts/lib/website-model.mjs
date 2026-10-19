import defaults from '../../src/data/website-defaults.json' with {type:'json'};

const field=(slug,label,type='string',required=false,validation)=>({slug,label,type,required,...(validation?{validation}:{})});
const heading=field('heading','Heading','string',true);
const body=field('body','Text','portableText');
const image=(slug='image',label='Replacement image (optional)')=>field(slug,label,'image');
const link=(slug,label)=>field(slug,label,'string',true,{pattern:'^(?:/(?!/)|https://|mailto:|tel:|#)'});
const rows=(slug,label,subFields,minItems=0,maxItems=30)=>field(slug,label,'repeater',true,{subFields,minItems,maxItems});
const item=(slug,label,type='string',required=true,options)=>({slug,label,type,required,...(options?{options}:{})});
const rich=(slug,label)=>field(slug,label,'portableText');

// Native, labelled forms; editors never have to write JSON or HTML.
export const websiteBlockTypes={
 pricing_page:{"label":"Service and price page copy","fields":[{"slug":"heading","label":"Married by Jake","type":"string","required":true},{"slug":"tagline","label":"Marriages made relevant and real.","type":"portableText","required":true},{"slug":"introduction","label":"Every wedding should feel unique and personal — never awkward, boring or","type":"portableText","required":true},{"slug":"review_introduction","label":"Thousands of delighted couples have been married by Jake — Australia’s m","type":"portableText","required":true},{"slug":"excluded_heading","label":"What you won’t get","type":"string","required":true},{"slug":"included_heading","label":"What’s included","type":"string","required":true},{"slug":"travel_note","label":"Travel may be included within the service area; additional travel fees c","type":"portableText","required":true},{"slug":"quote_note","label":"If Jake is available for your date, you’ll receive a personal quote as s","type":"portableText","required":true},{"slug":"booking_heading","label":"Booking procedure","type":"string","required":true},{"slug":"booking_note","label":"If you’d like to understand more about pricing and inclusions, our FAQs ","type":"portableText","required":true},{"slug":"next_heading","label":"What’s next?","type":"string","required":true},{"slug":"next_text","label":"Complete a short enquiry and we’ll confirm Jake’s availability and send ","type":"portableText","required":true},{"slug":"excluded_items","label":"What you won’t get — one item per line","type":"text","required":true},{"slug":"included_items","label":"What’s included — one item per line","type":"text","required":true},{"slug":"booking_steps","label":"Booking steps — one item per line","type":"text","required":true}]},
 site_images:{label:"Page photographs",fields:[image("wide","Wide homepage photo"),image("menu","Explore menu photo"),image("pricing","Service and price photo"),image("thank_you","Thank-you photo")]},
 intro:{label:'Page introduction and copy',fields:[heading,field('eyebrow','Opening line'),body,image()]},
 values:{label:'Values and philosophy',fields:[field('eyebrow','Section label'),heading,body,rich('secondary_body','Additional text'),rows('cards','Values',[item('title','Title'),item('description','Description','text'),item('icon','Icon','select',true,['integrity','action','partnership'])],1,12)]},
 statistics:{label:'Experience and statistics',fields:[heading,body,image(),rows('stats','Statistics',[item('label','Label'),item('value','Value')],1,10)]},
 approach:{label:'How it works',fields:[field('eyebrow','Section label'),heading,body,image(),field('quote','Featured review excerpt','text',true),field('quote_author','Review author','string',true),link('quote_url','Original review link'),rows('steps','Steps',[item('title','Title'),item('description','Description','text'),item('bullets','Bullet points — one per line','text')],1,12)]},
 cta:{label:'Enquiry invitation',fields:[heading,body,image(),field('primary_label','Main button label','string',true),link('primary_url','Main button link'),field('secondary_label','Second button label','string',true),link('secondary_url','Second button link'),field('note','Small print')]},
 videos:{label:'Video showcase',fields:[rows('videos','Videos',[item('title','Video title'),item('playback_id','Mux playback ID')],1,8)]},
 hero_media:{label:'Background video and posters',fields:[field('desktop_video','Desktop video URL','url',true),field('mobile_video','Mobile video URL','url',true),image('desktop_poster','Desktop poster'),image('mobile_poster','Mobile poster'),field('desktop_poster_path','Original desktop poster path','string',true),field('mobile_poster_path','Original mobile poster path','string',true),field('poster_alt','Poster description','string',true)]},
 video:{label:'Introduction video',fields:[field('title','Video title','string',true),field('src','Video URL','url',true),image('poster','Poster image'),field('poster_path','Original poster path','string',true),field('captions','English captions path','string',true)]},
 faq:{label:'Frequently asked questions',fields:[heading,body,field('primary_label','Button label','string',true),link('primary_url','Button link'),rows('questions','Questions',[item('question','Question'),item('answer','Answer','text'),item('show_pricing','Include the current price reference','boolean',false)],1,50)]},
 contact_form:{label:'Contact form',fields:[field('title','Accessible form title','string',true),field('url','Studio Ninja embed URL','url',true),field('height','Form height','integer',true,{min:400,max:5000})]},
 footer:{label:'Footer, branding and legal notice',fields:[field('email','Public email','string',true),field('phone','Public telephone (international format)','string',true),field('phone_label','Telephone display label','string',true),link('enquire_url','Enquiry button link'),field('menu_heading','Explore introduction heading','string',true),field('menu_description','Explore introduction text','text',true),field('tips_label','Blog menu heading','string',true),field('reviews_label','Review menu heading','string',true),field('all_tips_label','Blog link label','string',true),field('all_reviews_label','All reviews link label','string',true),rich('description','Short description'),rich('legal_notice','Legal notice'),image('logo','Replacement logo'),field('logo_alt','Logo description','string',true),field('copyright_name','Copyright name','string',true),rich('copyright_suffix','Copyright credits'),field('badge_label','Directory badge label','string',true),link('badge_url','Directory badge link'),field('quick_links_label','Quick links heading','string',true),field('social_links_label','Social links heading','string',true),field('found_on_label','Featured links heading','string',true),field('explore_label','Explore menu label','string',true),field('enquire_label','Enquiry button label','string',true),field('search_label','Search button label','string',true)]},
 page_seo:{label:'Page search and sharing',fields:[field('path','Page path','string',true),field('title','Search title','string',true),field('description','Search description','text',true),image('image','Social preview image'),field('canonical','Preferred canonical URL'),field('no_index','Ask search engines not to index this page','boolean')]},
};

export const websiteCollection={slug:'website',label:'Website sections',labelSingular:'Website section',description:'Homepage, landing pages, shared sections, videos, FAQs and page metadata. Keep these named sections published; Save draft keeps edits private.',group:'Website',supports:['drafts','revisions','scheduling','preview'],urlPattern:'/{slug}',routable:false,hasSeo:false,admin:{quickCreate:false}};
export const websiteFields=[
 {slug:'title',label:'Section name',type:'string',required:true,validation:null},
 {slug:'content',label:'Section settings',type:'blocks',required:false,validation:{allowedTypes:Object.keys(websiteBlockTypes),minItems:1,maxItems:1}},
];
// Revision-managed fields replace the disconnected side-table SEO panel.
export const publishedSeoFields=[
 {slug:'search_title',label:'Search title',type:'string',validation:{maxLength:200}},
 {slug:'search_description',label:'Search description',type:'text',validation:{maxLength:500}},
 {slug:'social_image',label:'Social preview image',type:'image',validation:null},
 {slug:'preferred_url',label:'Preferred canonical URL',type:'string',validation:{pattern:'^(?:$|/(?!/)|https://)'}},
 {slug:'hide_from_search',label:'Ask search engines not to index this page',type:'boolean',defaultValue:false,validation:null},
];

export function safePublicHref(value){
 if(typeof value!=='string'||/[\u0000-\u001f\\]/.test(value)||! /^(?:\/(?!\/)|https:\/\/|mailto:|tel:|#)/i.test(value))return false;
 try{const url=new URL(value,'https://marriedbyjake.com');return !url.username&&!url.password&&!url.searchParams.has('_preview')&&!url.searchParams.has('_edit')&& !/^\/(?:_emdash|_preview|_publishing|_private-image|_image)(?:\/|$)/.test(url.pathname);}catch{return false;}
}
function check(value,definition,path){
 if(value==null||value===''){if(definition.required)throw Error(`Website setting ${path} is required`);return;}
 const {type}=definition;const validation=definition.validation||{};
 if(['string','text','url','select'].includes(type)){
  if(typeof value!=='string'||value.length>20000)throw Error(`Invalid website text: ${path}`);
  if(type==='url'&&(!safePublicHref(value)||!value.startsWith('https://')))throw Error(`Website URL must use public HTTPS: ${path}`);
  if(validation.pattern&&(!new RegExp(validation.pattern).test(value)||!safePublicHref(value)))throw Error(`Invalid website link: ${path}`);
  if(validation.options&&!validation.options.includes(value))throw Error(`Invalid website choice: ${path}`);
 }else if(type==='boolean'){
  if(![true,false,0,1].includes(value))throw Error(`Invalid website switch: ${path}`);
 }else if(type==='integer'){
  if(!Number.isInteger(value)||(validation.min!=null&&value<validation.min)||(validation.max!=null&&value>validation.max))throw Error(`Invalid website number: ${path}`);
 }else if(type==='portableText'){
  if(!Array.isArray(value))throw Error(`Invalid website rich text: ${path}`);
 }else if(type==='image'){
  if(typeof value!=='object'||!value.id)throw Error(`Invalid website image: ${path}`);
 }else if(type==='repeater'){
  if(!Array.isArray(value)||value.length<(validation.minItems||0)||value.length>(validation.maxItems||30))throw Error(`Invalid website list: ${path}`);
  value.forEach((row,i)=>{if(!row||typeof row!=='object')throw Error(`Invalid website list item: ${path}`);for(const sub of validation.subFields)check(row[sub.slug],{...sub,validation:sub.options?{options:sub.options}:{}},`${path}.${i}.${sub.slug}`);});
 }
}
export function validateWebsiteEntry(slug,data){
 const expected=defaults[slug];if(!expected)throw Error(`Unknown website section: ${slug}`);
 if(!Array.isArray(data.content)||data.content.length!==1)throw Error(`Website section ${slug} needs exactly one settings block`);
 const block=data.content[0],definition=websiteBlockTypes[block?._type];
 if(!definition||block._type!==expected.content[0]._type||block._version!==1||!block._key)throw Error(`Unsupported website settings block: ${slug}`);
 const allowed=new Set(['_type','_version','_key',...definition.fields.map(f=>f.slug)]);
 if(Object.keys(block).some(key=>!allowed.has(key)))throw Error(`Unexpected field in website section: ${slug}`);
 for(const f of definition.fields)check(block[f.slug],f,`${slug}.${f.slug}`);
 if(block._type==='videos'&&block.videos.some(row=>! /^[a-zA-Z0-9]+$/.test(row.playback_id)))throw Error('Use a Mux playback ID, not a video page URL');
 if(block._type==='footer'&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(block.email)||!/^\+[0-9]{7,15}$/.test(block.phone)))throw Error('Public email or telephone is invalid');
 if(block._type==='contact_form'){
  const u=new URL(block.url);if(u.origin!=='https://app.studioninja.co'||!u.pathname.startsWith('/contactform/parser/'))throw Error('The contact form must use a Studio Ninja contact-form URL');
 }
 if(block._type==='page_seo'&&block.path!==expected.content[0].path)throw Error('A search-settings entry must retain its original page path');
 if(block._type==='page_seo'&&block.canonical&&!safePublicHref(block.canonical))throw Error('Invalid preferred canonical URL');
 for(const name of ['desktop_poster_path','mobile_poster_path','poster_path','captions'])if(block[name]&&!safePublicHref(block[name]))throw Error(`Invalid website asset path: ${slug}.${name}`);
 return block;
}
export {defaults as websiteDefaults};
