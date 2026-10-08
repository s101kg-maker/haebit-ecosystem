(function(root){
 const REASONS=[
 '먹을 것을 찾아다니지 않아도 살아갈 수 있을 것 같아서',
 '주변의 다른 생물을 먹으며 살아갈 것 같아서',
 '오래된 낙엽이나 생물이 남긴 흔적이 많은 곳에서 살아가기 좋을 것 같아서',
 '아직 잘 모르겠어요'
 ];
 const QUESTIONS=[
 {title:'먹이 없이도 살아갈 직원',lines:['이곳에서는 먹이를 따로 제공할 수 없습니다.','먹을 것을 찾아다니지 않아도 살아갈 수 있는 직원을 보내 주세요.'],organisms:[{name:'소나무',asset:'pine'},{name:'토끼',asset:'rabbit'},{name:'곰팡이',asset:'mold'}]},
 {title:'먹을 것을 찾아다닐 직원',lines:['이곳에는 먹을 것이 풍부합니다.','주변을 돌아다니며 먹을 것을 찾아 살아갈 직원이 필요합니다.'],organisms:[{name:'강아지풀',asset:'grass'},{name:'토끼',asset:'rabbit'},{name:'버섯',asset:'mushroom'}]},
 {title:'흔적이 쌓인 곳에 보낼 직원',lines:['이곳에는 오래된 낙엽과 생물이 남긴 흔적이 많이 쌓여 있습니다.','이곳에서 살아가기에 알맞은 직원을 보내 주세요.'],organisms:[{name:'곰팡이',asset:'mold'},{name:'매',asset:'hawk'},{name:'소나무',asset:'pine'}]}
 ];
 const content={QUESTIONS,REASONS};
 if(typeof module!=='undefined') module.exports=content; else root.Content=content;
})(typeof window!=='undefined'?window:globalThis);
