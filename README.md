# 🥇 드롭스 (Drops)

[실행 방법]

Frontend
```
npm install
npm run dev
```
파일 업로드 서버
```
npm run upload
```
데이터 서버
```
npx json-server data.json
```

### 1. 개요

## Problem

소비 내역을 기록하고 관리하고 싶어도,
직접 하나씩 입력하는 과정이 번거롭고 영수증 관리도 따로 해야 해서 지속적으로 사용하기 어렵다.

## User Research

Insight1: Insight 1: 지출 내역을 일일이 입력하기 귀찮아😥
⇒ 영수증 이미지 업로드 및 AI 기반 영수증 분석

Insight2: 거래 내역은 쌓이는데 어디에 많이 썼는지 한눈에 보기 어려워😫
⇒ 카테고리별 거래 내역 조회 및 월별 소비 분석

Insight3: 영수증 사진과 거래 정보를 따로 관리하니까 찾기 불편해😑
⇒ 영수증 이미지와 거래 내역을 함께 저장 및 관리

## Solution

AI를 활용한 영수증 분석 기능으로
사용자의 입력 부담을 줄이고, 소비 내역을 더 쉽게 기록하고 관리할 수 있는 가계부 서비스

---


### 2. 개발 환경

⚙ Management Tool  

<img alt ="Notion" src = "https://img.shields.io/badge/Notion-000000?style=flat-square&logo=notion&logoColor=white"> <img alt ="Figma" src = "https://img.shields.io/badge/Figma-F24E1E?style=flat-square&logo=figma&logoColor=white"> <img alt ="GitHub" src = "https://img.shields.io/badge/GitHub-181717?style=flat-square&logo=github&logoColor=white"> <img alt ="Canva" src = "https://img.shields.io/badge/Canva-00C4CC?style=flat-square&logo=canva&logoColor=white">

🖥️ IDE  

<img src="https://img.shields.io/badge/vscode-007ACC?style=flat-square&logo=visualstudiocode&logoColor=white">

🌄 Frontend  
<img src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white">
<img src="https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white">
<img src="https://img.shields.io/badge/JAVASCRIPT-F7DF1E?style=flat-square&logo=javascript&logoColor=white">
<img src="https://img.shields.io/badge/vue.js-4FC08D?style=flat-square&logo=vue.js&logoColor=white">
<img src="https://img.shields.io/badge/Vue Router-4FC08D?style=flat-square&logo=vue.js&logoColor=white">
<img src="https://img.shields.io/badge/Pinia-FFD859?style=flat-square&logo=pinia&logoColor=black">
<img src="https://img.shields.io/badge/axios-5A29E4?style=flat-square&logo=axios&logoColor=white">
<img src="https://img.shields.io/badge/vite-646CFF?style=flat-square&logo=vite&logoColor=white">

🗂️ Data Server

<img src="https://img.shields.io/badge/json--server-000000?style=flat-square&logo=json&logoColor=white">

🤖 AI / OCR

<img src="https://img.shields.io/badge/OpenAI-412991?style=flat-square&logo=openai&logoColor=white">

---

### 3. 기술 소개

1.  OpenAI API

    자연어 처리를 비롯한 다양한 ai 기술들을 활용하여 다양한 기능을 제공하는 API
    
    https://platform.openai.com/
    
    1) 영수증 이미지에서 추출한 텍스트를 바탕으로
    거래 날짜, 금액, 장소, 품목 등 필요한 정보를 정리하는 데 활용한 AI API
    
    - 영수증 OCR 결과 정제
    - 구매 품목 추출
    - 거래 메모 및 소비 정보 자동 생성

    2) 거래 내역 데이터를 바탕으로 월별 소비 패턴을 분석하고,
    사용자가 자신의 소비 흐름을 한눈에 이해할 수 있도록 요약 정보를 제공하는 기능입니다.

    - 카테고리별 소비 비중 분석
    - 월간 소비 패턴 요약
    - 절약 가이드 추천
    - 다음 달 예상 지출 예측
    
3.  Json-server
    프론트엔드 개발 단계에서 거래 내역, 영수증 데이터, 카테고리 데이터 등을
    빠르게 저장하고 조회하기 위한 Mock API 서버로 사용

    - 거래 목록 조회
    - 거래 상세 조회
    - 거래 추가 / 수정 / 삭제
    - 영수증 데이터 저장 및 삭제

4. Express + Multer

    사용자가 업로드한 영수증 이미지를 서버에 저장하고,
    저장된 파일 경로를 프론트와 연결하기 위해 사용

    - 영수증 이미지 업로드 처리
    - 정적 파일 경로 제공
    - 거래 삭제 시 연결된 영수증 파일 삭제 처리


---

4. 주요 기능
    1. 영수증 업로드 및 분석
      - 사용자가 영수증 이미지를 업로드
      - 서버에 이미지 파일 저장
      - AI를 활용해 영수증 텍스트를 분석
      - 날짜, 금액, 장소, 품목 등의 거래 정보 자동 생성
    2. 거래 내역 관리
      - 거래 목록 조회
      - 거래 상세 조회
      - 거래 추가, 수정, 삭제
      - 영수증이 연결된 거래 삭제 시 영수증 데이터와 이미지 파일까지 함께 삭제
    3. 월별 소비 분석
      - 월별 거래 내역 필터링
      - 카테고리별 소비 금액 확인
      - 수입 / 지출 흐름 확인
    4. 날짜 기반 필터링
      - 기간 선택 필터
      - 특정 날짜 선택 조회
      - 사용자 입력에 따라 거래 내역을 원하는 조건으로 확인 가능
  

