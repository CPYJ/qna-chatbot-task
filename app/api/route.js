import { GoogleGenAI } from '@google/genai';
import { QdrantClient } from '@qdrant/js-client-rest';

if (!process.env.GEMINI_API_KEY || !process.env.QDRANT_URL 
    || !process.env.QDRANT_API_KEY || !process.env.QDRANT_COLLECTION 
    || !process.env.EMBEDDING_MODEL || !process.env.EMBEDDING_DIM) {
  console.error('환경변수 누락: GEMINI/QDRANT 값을 설정하세요.');
  return new Response(JSON.stringify({ error: 'server config error' }), { status: 500 });
}


const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,       
  apiKey: process.env.QDRANT_API_KEY, 
});

// qdrant 내 폴더
const COLLECTION = process.env.QDRANT_COLLECTION;
const MODEL = process.env.EMBEDDING_MODEL; 

// post 핸들러
export async function POST(req) {

  try {
    const { question } = await req.json();
    // 질문이 비어있다면 에러 반환
    if (!question?.trim())
      return new Response(JSON.stringify({ error: '질문이 필요합니다.' }), { status: 400 });
   

    // 유저의 질문을 벡터로 변환
    const res = await genAI.models.embedContent({
      model: MODEL,
      contents: [question],
      outputDimensionality: Number(process.env.EMBEDDING_DIM)
    });
    // 벡터화 된 질문 반환
    const vector = res.embeddings[0].values;


    // qdrant에서 질문 벡터와 가장 비슷한 벡터 검색
    const results = await qdrant.search(COLLECTION, {
      vector, // 질문 벡터
      limit: 1, // top-k 1 = 가장 유사한 결과 1개 반환
      with_payload: true, // payload(답변)도 같이 달라고 요청
      score_threshold: 0.6, // 유사도 최저기준 설정. 유연한 검색을 위해 0.6
    });


    //비슷한 질문을 못 찾으면 안내 메시지 반환
    if (!results.length)
      return new Response(JSON.stringify({ answer: '데이터셋에 없는 질문이에요.' }), { status: 200 });


    // 가장 유사한 하나를 꺼내서, 그 벡터에 연결된 payload.answer(=정답 텍스트)만 그대로 반환
    const answer = results[0]?.payload?.answer;
    return new Response(JSON.stringify({ answer }), { status: 200 });

  } catch (e) { // 예외
    console.error('API 오류:', e);
    return new Response(JSON.stringify({ error: 'server error' }), { status: 500 });
  }
}
