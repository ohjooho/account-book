<template>
  <div class="container">
    <div class="receiptArea">
      <font-awesome-icon icon="fa-solid fa-receipt" class="receiptImage" />
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        style="display: none"
        @change="handleFileChange"
      />
      <button class="receiptButton" @click="openFilePicker" :disabled="loading">
        {{ loading ? '분석 중...' : '영수증 첨부' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

const router = useRouter();
const fileInput = ref(null);
const loading = ref(false);

const openFilePicker = () => {
  fileInput.value?.click();
};

const fileToBase64 = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(',')[1];
      resolve({
        base64,
        dataUrl: result,
      });
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const analyzeReceiptWithOpenAI = async (file) => {
  const { base64, dataUrl } = await fileToBase64(file);
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `
                이 이미지는 영수증이다.
                반드시 아래 JSON 형식으로만 응답해라.
                모르는 값은 null로 넣어라.

                규칙:
                - categoryId는 income, living, subscription, shopping, food, transport, medical, etc 중 하나만 넣어라.
                - memo는 어디서 어떤 품목을 구매했는지 짧게 요약한다.
                - 환불 안내, 광고 문구, 고지 문구는 제외한다.
                - place는 실제 매장명만 넣어라.
                - products는 실제 구매 상품명 배열만 넣어라.
                - location은 추론하지 말고 항상 null로 둬라.

                {
                "ocrRawText": "string | null",
                "date": "YYYY-MM-DD | null",
                "categoryId": "string | null",
                "memo": "string | null",
                "price": number | null,
                "type": "expense | income | null",
                "place": "string | null",
                "location": null,
                "products": ["string"]
                }
            `.trim(),
            },
            {
              type: 'input_image',
              image_url: `data:${file.type};base64,${base64}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'OpenAI 요청 실패');
  }

  const data = await response.json();
  const text = data.output_text || data.output?.[0]?.content?.[0]?.text || '{}';
  const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}');
  const draftId = Number(
    new Date().toISOString().slice(0, 10).replaceAll('-', '') +
      String(Date.now()).slice(-4),
  );
  return {
    id: draftId,
    imageUrl: dataUrl,
    status: 'reviewing',
    ocrRawText: parsed.ocrRawText ?? '',
    aiResult: {
      date: parsed.date ?? new Date().toISOString().slice(0, 10),
      categoryId: parsed.categoryId ?? 'etc',
      memo:
        parsed.place && Array.isArray(parsed.products) && parsed.products.length
          ? `${parsed.place}에서 ${parsed.products.join(', ')} 구매`
          : (parsed.memo ?? ''),
      price: parsed.price ?? 0,
      type: parsed.type ?? 'expense',
      place: parsed.place ?? '',
      location: {
        lat: null,
        lng: null,
      },
      products: Array.isArray(parsed.products) ? parsed.products : [],
    },
  };
};

const saveReceiptDraft = async (draftData) => {
  const response = await fetch('http://localhost:3001/receiptDrafts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(draftData),
  });

  if (!response.ok) {
    throw new Error('receiptDraft 저장 실패');
  }

  return await response.json();
};

const handleFileChange = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  console.log(file);
  loading.value = true;

  try {
    const draftData = await analyzeReceiptWithOpenAI(file);
    //   const savedDraft = await saveReceiptDraft(draftData);
    console.log(draftData);

    //   router.push(`/receipt/${savedDraft.id}`);
  } catch (error) {
    console.error(error);
    alert('영수증 분석 또는 저장 중 오류가 발생했습니다.');
  } finally {
    loading.value = false;
    event.target.value = '';
  }
};
</script>

<style scope>
.container {
  width: 100%;
  height: 90%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.receiptArea {
  width: 50%;
  height: 50%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.receiptImage {
  width: 50%;
  height: 50%;
  min-width: 120px;
  padding-bottom: 2rem;
  color: black;
}

.receiptButton {
  width: 30%;
  height: 15%;
  min-width: 120px;
  font-size: 1rem;
  font-weight: 700;
  background-color: #4e8780;
  border-radius: 17px;
}
</style>
