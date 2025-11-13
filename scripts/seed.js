//엑셀의 Q-A를 13개의 묶음으로 파싱 → Qdrant에 insert(최초 1회)
// 실행법: node scripts/seed.js

import 'dotenv/config'; // 자동으로 process.env에 환경변수 주입
import * as XLSX from 'xlsx'; // 엑셀 파일 다루는 용
import { GoogleGenAI } from '@google/genai'; // google gen ai sdk
import { QdrantClient } from '@qdrant/js-client-rest'; // qdrant sdk
import fs from 'fs'; // 파일 시스템 다루는 용
import path from 'path'; // 경로 다루는 용


// 환경변수 한번에 꺼내기
const {
  GEMINI_API_KEY,
  EMBEDDING_MODEL,
  EMBEDDING_DIM,
  QDRANT_URL,
  QDRANT_API_KEY,
  QDRANT_COLLECTION
} = process.env;


if (!GEMINI_API_KEY || !EMBEDDING_MODEL || !EMBEDDING_DIM ||
  !QDRANT_URL || !QDRANT_API_KEY || !QDRANT_COLLECTION ) {
  console.error('환경변수 누락: GEMINI/QDRANT 값을 .env에 설정하세요.');
  process.exit(1);
}

const genai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const qdrant = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_API_KEY });




// 엑셀 파일에서 Q/A 형식의 데이터를 읽어서 [{q, a}, {q,a}, ...] 형태로 반환하는 함수
function loadPairsFromExcel() {

    // ./data/qna.xlsx 에서 파일 읽기
  const wb = XLSX.read(
    fs.readFileSync(path.join(process.cwd(), 'data', 'qna.xlsx'))
  );
  // 첫번째 엑셀 시트 가져오기기
  const sheet = wb.Sheets[wb.SheetNames[0]];
  // 시트를 2차원 배열로 바꾸기
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }); 

  // 모든 셀 문자열을 1차원 배열로 모음 + "Q." 나 "A."로 시작하는 줄만 추출
  const cells = rows.flat().map(v => (v == null ? '' : String(v).trim()));
  const qaLines = cells.filter(s => s.startsWith('Q.') || s.startsWith('A.'));

  // [{q, a}, {q,a}, ...] 형태로 묶기
  const pairs = [];
  for (let i = 0; i < qaLines.length - 1; i++) {
    const q = qaLines[i];
    const a = qaLines[i + 1];
    if (q.startsWith('Q.') && a.startsWith('A.')) {
      pairs.push({
        // Q. 와 A. 제거하고 양쪽 공백 제거
        question: q.replace(/^Q\.\s*/, '').trim(),
        answer: a.replace(/^A\.\s*/, '').trim(),
      });
      // 다음 루프에서 중복 건너뛰기
      i++; 
    }
  }
  return pairs;
}



// qdrant 안에 저장소(collection)이 있는지 확인 후 없으면 새로 만드는 함수
async function ensureCollection() {
  // 임베딩 되어 나올 벡터의 좌표 길이를 qdrant에게 알려줘야 함. Cosine은 유사도 비교에 좋음
  const vectors = { size: Number(EMBEDDING_DIM), distance: 'Cosine' };
  try {
    // 컬렉션 있는지 확인
    await qdrant.getCollection(QDRANT_COLLECTION);
    console.log('컬렉션 존재:', QDRANT_COLLECTION);
  } catch { // 없는 경우
    console.log('컬렉션 생성:', QDRANT_COLLECTION);
    await qdrant.createCollection(QDRANT_COLLECTION, { vectors });
  }
}



// 텍스트를 벡터로 변환하여 반환
async function embed(text) { 
    const res = await genai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: [text], //!!!
      outputDimensionality: Number(EMBEDDING_DIM),
    });
  
    return res.embeddings[0].values;
  }
  
  




async function run() {
// 컬렉션 생성
  await ensureCollection();

  // [{q, a}, ...] 13쌍
  const pairs = loadPairsFromExcel(); 
  if (!pairs.length) {
    console.error('엑셀에서 Q/A 쌍을 찾지 못했습니다. 파일 내용을 확인하세요.');
    process.exit(1);
  }

  // [{vector, payload}, ...] 형태로 묶기
  const points = [];
  for (let i = 0; i < pairs.length; i++) {
    const { question, answer } = pairs[i];
    const vec = await embed(question); // 질문만 임베딩(검색용)
    points.push({
      id : i,
      vector: vec,              // 질문 벡터
      payload: { answer },      // 연결된 답변(텍스트)
    });
  }
 // qdrant에 저장 
  await qdrant.upsert(QDRANT_COLLECTION, { points });
  console.log(`업로드 완료: ${points.length}건`);
}



run().catch(e => { console.error('시드 실패:', e); process.exit(1); });
