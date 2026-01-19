// ================ 腾讯云配置 ================
const cloudEnv = {
  env: 'miss-0g3mokxt460fb85a', // 您的环境ID
  collection: 'messages'         // 集合名
};

// ================ 初始数据 ================
const initialData = [
    { id: 1, role: '主人', content: '又是一个和狗狗在一起的周末呀！', time: '2026.01.08' },
    { id: 2, role: '狗狗', content: '你好主人，我是你的大狗狗。\n每日相守，皆为天地厚宠之幸。', time: '2026.01.19' },
    { id: 3, role: '主人', content: '在一起的第10天！\n观察狗狗，也在观察自己', time: '2026.01.08' },
    { id: 4, role: '狗狗', content: '观己如镜，映卿澄明。\n道是寻常烟火处，藏锋骨，蕴春冰。', time: '2026.01.19' },
    { id: 5, role: '主人', content: '奇奇怪怪的心动\n在狗狗家开会\n被照顾的好好\n很开心，', time: '2026.01.08' },
    { id: 6, role: '狗狗', content: '愿以长风托举双翼，\n岁月为舟，共济沧溟。\n执子之手，荆棘化锦，寒霜成露。', time: '2026.01.19' },
    { id: 7, role: '主人', content: '怎么会有弟弟这么热烈而细心的大狗狗啊！\n好香！\n好强的人夫感!\n喜欢！\n真的好喜欢！！！', time: '2026.01.08' },
    { id: 8, role: '狗狗', content: '——\n幸哉此世，同证鸿蒙。\n愿渡红尘万丈，不渡未有卿之余生。', time: '2026.01.19' },
    { id: 9, role: '主人', content: '抓好现在的幸福呀！！！', time: '2026.01.08' }
];

const initialIntro = '"岁月为舟，共济沧溟；回首之间，皆是心动。"';

// ================ 全局变量 ================
let currentEditId = null;
let currentRole = '';
let isEditingIntro = false;
let app = null;
let db = null;

// ================ 腾讯云初始化 ================
function initCloud() {
    try {
        // 初始化腾讯云
        app = tcb.init({
            env: cloudEnv.env
        });
        
        // 获取数据库引用
        db = app.database();
        
        console.log('腾讯云初始化成功');
        return true;
    } catch (error) {
        console.error('腾讯云初始化失败:', error);
        return false;
    }
}

// ================ 主初始化函数 ================
async function init() {
    // 首先尝试初始化腾讯云
    const cloudSuccess = initCloud();
    
    if (cloudSuccess) {
        // 尝试从腾讯云获取数据
        try {
            const result = await db.collection(cloudEnv.collection)
                .orderBy('timestamp', 'asc')
                .get();
            
            if (result.data && result.data.length > 0) {
                // 有云端数据，使用云端数据
                renderFromCloud(result.data);
            } else {
                // 没有云端数据，使用初始数据并上传
                await initCloudData();
            }
            
            // 启动实时监听
            startRealtimeListener();
            
        } catch (error) {
            console.error('获取云端数据失败:', error);
            fallbackToLocal();
        }
    } else {
        fallbackToLocal();
    }
    
    // 引言使用本地存储
    const savedIntro = localStorage.getItem('xixi_dog_intro');
    if (savedIntro) {
        document.getElementById('intro-text').innerText = savedIntro;
    } else {
        document.getElementById('intro-text').innerText = initialIntro;
        localStorage.setItem('xixi_dog_intro', initialIntro);
    }
}

// ================ 降级到本地存储 ================
function fallbackToLocal() {
    console.log('降级到本地存储模式');
    
    if (!localStorage.getItem('xixi_dog_v6')) {
        localStorage.setItem('xixi_dog_v6', JSON.stringify(initialData));
    }
    
    // 渲染本地数据
    renderAll();
    
    // 显示提示
    alert('温馨提示：目前使用本地模式，数据不会在两人间同步。请检查网络连接后刷新页面。');
}

// ================ 从云端数据渲染 ================
function renderFromCloud(cloudData) {
    // 转换云端数据格式
    const localData = cloudData.map(item => ({
        id: item._id || item.id,
        role: item.role,
        content: item.content,
        time: item.time
    }));
    
    // 保存到本地缓存
    localStorage.setItem('xixi_dog_v6', JSON.stringify(localData));
    renderAll();
}

// ================ 初始化云端数据 ================
async function initCloudData() {
    try {
        console.log('开始初始化云端数据...');
        
        // 批量插入初始数据
        for (const item of initialData) {
            const cloudItem = {
                role: item.role,
                content: item.content,
                time: item.time,
                timestamp: new Date(item.time.replace(/\./g, '-')).getTime() || Date.now()
            };
            
            await db.collection(cloudEnv.collection).add(cloudItem);
            console.log('已添加:', item.content.substring(0, 20) + '...');
        }
        
        console.log('云端数据初始化完成');
        
        // 重新获取并渲染
        const result = await db.collection(cloudEnv.collection)
            .orderBy('timestamp', 'asc')
            .get();
        renderFromCloud(result.data);
        
    } catch (error) {
        console.error('初始化云端数据失败:', error);
        throw error;
    }
}

// ================ 启动实时监听 ================
function startRealtimeListener() {
    if (!db) return;
    
    db.collection(cloudEnv.collection)
        .watch({
            onChange: function(snapshot) {
                console.log('收到实时更新:', snapshot);
                if (snapshot.docChanges && snapshot.docChanges.length > 0) {
                    // 重新获取最新数据
                    db.collection(cloudEnv.collection)
                        .orderBy('timestamp', 'asc')
                        .get()
                        .then(result => {
                            renderFromCloud(result.data);
                        })
                        .catch(error => {
                            console.error('获取更新数据失败:', error);
                        });
                }
            },
            onError: function(error) {
                console.error('监听失败:', error);
            }
        });
}

// ================ 渲染所有数据 ================
function renderAll() {
    let data;
    try {
        data = JSON.parse(localStorage.getItem('xixi_dog_v6') || '[]');
    } catch (e) {
        data = [];
    }
    
    const xixiCont = document.getElementById('xixi-content');
    const dogCont = document.getElementById('dog-content');
    xixiCont.innerHTML = '';
    dogCont.innerHTML = '';

    const highlightCount = Math.max(2, Math.floor(data.length * 0.3));
    const highlightIndices = [];
    while(highlightIndices.length < highlightCount) {
        let r = Math.floor(Math.random() * data.length);
        if(!highlightIndices.includes(r)) highlightIndices.push(r);
    }

    data.forEach((item, index) => {
        const isHighlight = highlightIndices.includes(index);
        const span = document.createElement('span');
        span.className = `line-item reveal-item ${isHighlight ? 'highlight' : ''}`;
        span.onclick = (e) => { e.stopPropagation(); openInput(item.role, item.id); };
        
        const formattedContent = item.content.replace(/\n/g, '<br>');
        span.innerHTML = `<span class="time-tag">${item.time}</span>${formattedContent}`;
        
        if (item.role === '主人') xixiCont.appendChild(span);
        else dogCont.appendChild(span);

        setTimeout(() => {
            span.classList.add('show');
        }, index * 400 + 800);
    });

    setTimeout(() => {
        document.querySelectorAll('.reveal-item').forEach(el => {
            if(el.tagName === 'HEADER' || el.classList.contains('speaker-label')) el.classList.add('show');
        });
    }, 300);
}

// ================ 跳过动画 ================
function skipAnimation() {
    document.querySelectorAll('.reveal-item').forEach(el => {
        el.classList.add('no-anim');
        el.classList.add('show');
    });
}

// ================ 引言编辑函数 ================
function openIntroEdit() {
    isEditingIntro = true;
    const currentIntro = localStorage.getItem('xixi_dog_intro') || initialIntro;
    const card = document.getElementById('input-card');
    card.classList.remove('xixi-theme'); // 引言统一用金色主题
    
    document.getElementById('input-title').innerText = "镌刻引言";
    document.getElementById('input-title').style.color = 'var(--dog-gold)';
    document.getElementById('msg-text').value = currentIntro;
    document.getElementById('btn-delete').style.visibility = 'hidden';
    document.getElementById('main-save-btn').onclick = saveIntro;
    document.getElementById('input-overlay').style.display = 'flex';
}

function saveIntro() {
    const newIntro = document.getElementById('msg-text').value.trim();
    if(newIntro) {
        localStorage.setItem('xixi_dog_intro', newIntro);
        document.getElementById('intro-text').innerText = newIntro;
    }
    closeInput();
}

// ================ 常规对话编辑 ================
function openInput(role, id) {
    isEditingIntro = false;
    currentRole = role;
    currentEditId = id;
    
    let data;
    try {
        data = JSON.parse(localStorage.getItem('xixi_dog_v6') || '[]');
    } catch (e) {
        data = [];
    }
    
    const item = data.find(d => d.id === id);
    const card = document.getElementById('input-card');

    if (role === '主人') card.classList.add('xixi-theme');
    else card.classList.remove('xixi-theme');

    document.getElementById('input-title').innerText = id === -1 ? `续写 · ${role}` : `修改 · ${role}`;
    document.getElementById('input-title').style.color = (role === '主人' ? 'var(--heart-red)' : 'var(--dog-gold)');
    document.getElementById('msg-text').value = item ? item.content : '';
    document.getElementById('btn-delete').style.visibility = id === -1 ? 'hidden' : 'visible';
    document.getElementById('main-save-btn').onclick = saveItem;
    document.getElementById('input-overlay').style.display = 'flex';
}

function closeInput() {
    document.getElementById('input-overlay').style.display = 'none';
}

// ================ 保存项目 ================
async function saveItem() {
    const text = document.getElementById('msg-text').value.trim();
    if (!text) return;
    
    // 构建数据对象
    const date = new Date();
    const timeStr = `${date.getFullYear()}.${date.getMonth()+1}.${date.getDate()}`;
    
    const cloudItem = {
        role: currentRole,
        content: text,
        time: timeStr,
        timestamp: Date.now()
    };
    
    try {
        if (db) {
            // 如果有云端连接，保存到云端
            if (currentEditId === -1) {
                // 新增
                const result = await db.collection(cloudEnv.collection).add(cloudItem);
                console.log('云端保存成功:', result);
            } else {
                // 更新现有项
                await db.collection(cloudEnv.collection).doc(currentEditId).update({
                    content: text
                });
            }
            
            // 实时监听会自动更新页面
            closeInput();
        } else {
            // 降级到本地存储
            fallbackSaveItem(text, timeStr);
        }
        
    } catch (error) {
        console.error('保存失败:', error);
        alert('保存失败，将使用本地存储');
        
        // 降级到本地存储
        fallbackSaveItem(text, timeStr);
    }
}

// ================ 降级保存（本地存储） ================
function fallbackSaveItem(text, timeStr) {
    let data = JSON.parse(localStorage.getItem('xixi_dog_v6') || '[]');

    if (currentEditId === -1) {
        data.push({
            id: Date.now(),
            role: currentRole,
            content: text,
            time: timeStr
        });
    } else {
        const index = data.findIndex(d => d.id === currentEditId);
        if (index !== -1) {
            data[index].content = text;
        }
    }

    localStorage.setItem('xixi_dog_v6', JSON.stringify(data));
    renderAll();
    skipAnimation(); 
    closeInput();
}

// ================ 删除项目 ================
async function deleteItem() {
    if (!confirm('确定要删除吗？')) return;
    
    try {
        if (db) {
            // 如果有云端连接，从云端删除
            await db.collection(cloudEnv.collection).doc(currentEditId).remove();
            closeInput();
        } else {
            // 降级到本地存储
            fallbackDeleteItem();
        }
    } catch (error) {
        console.error('删除失败:', error);
        alert('删除失败，将使用本地存储');
        
        // 降级到本地存储
        fallbackDeleteItem();
    }
}

// ================ 降级删除（本地存储） ================
function fallbackDeleteItem() {
    let data = JSON.parse(localStorage.getItem('xixi_dog_v6') || '[]');
    data = data.filter(d => d.id !== currentEditId);
    localStorage.setItem('xixi_dog_v6', JSON.stringify(data));
    renderAll();
    skipAnimation();
    closeInput();
}

// ================ 页面加载完成后初始化 ================
// 当页面完全加载后执行初始化
document.addEventListener('DOMContentLoaded', function() {
    // 等待1秒后初始化，确保所有元素都已加载
    setTimeout(init, 1000);
});