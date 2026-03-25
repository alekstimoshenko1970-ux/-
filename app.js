const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const sendBtn = document.getElementById('sendBtn');
const speakBtn = document.getElementById('speakBtn');
const statusEl = document.getElementById('status');
const transcriptEl = document.getElementById('transcript');
const responseEl = document.getElementById('response');
const apiKeyEl = document.getElementById('apiKey');
const systemPromptEl = document.getElementById('systemPrompt');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

const setStatus = (text) => {
  statusEl.textContent = `Статус: ${text}`;
};

if (!SpeechRecognition) {
  setStatus('браузер не поддерживает распознавание речи');
  startBtn.disabled = true;
  stopBtn.disabled = true;
} else {
  recognition = new SpeechRecognition();
  recognition.lang = 'ru-RU';
  recognition.interimResults = true;
  recognition.continuous = true;

  recognition.onstart = () => {
    setStatus('слушаю...');
    startBtn.disabled = true;
    stopBtn.disabled = false;
  };

  recognition.onend = () => {
    setStatus('ожидание');
    startBtn.disabled = false;
    stopBtn.disabled = true;
  };

  recognition.onresult = (event) => {
    let finalText = '';
    let interimText = '';

    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const text = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalText += text + ' ';
      else interimText += text;
    }

    transcriptEl.value = `${transcriptEl.value}${finalText}${interimText}`.trim();
  };

  recognition.onerror = (event) => {
    setStatus(`ошибка распознавания: ${event.error}`);
  };
}

startBtn.addEventListener('click', () => {
  transcriptEl.value = '';
  recognition?.start();
});

stopBtn.addEventListener('click', () => {
  recognition?.stop();
});

sendBtn.addEventListener('click', async () => {
  const apiKey = apiKeyEl.value.trim();
  const userText = transcriptEl.value.trim();
  const systemPrompt = systemPromptEl.value.trim();

  if (!apiKey) {
    alert('Добавь API ключ OpenAI.');
    return;
  }

  if (!userText) {
    alert('Сначала запиши голосовой запрос.');
    return;
  }

  sendBtn.disabled = true;
  setStatus('отправляю запрос в нейросеть...');

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt || 'Ты полезный голосовой ассистент.' },
          { role: 'user', content: userText }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content?.trim() || 'Ответ пустой';
    responseEl.value = answer;
    speakBtn.disabled = false;
    setStatus('готово');
  } catch (error) {
    responseEl.value = `Ошибка: ${error.message}`;
    setStatus('ошибка запроса');
  } finally {
    sendBtn.disabled = false;
  }
});

speakBtn.addEventListener('click', () => {
  const text = responseEl.value.trim();
  if (!text) return;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ru-RU';
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
});
