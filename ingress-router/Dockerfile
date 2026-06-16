FROM node:12.16 
#버전 이미지 사용
LABEL maintainer=HansuChung<Hansu.chung@kweather.co.kr> 
#컨테이너 실행권한 관련 라벨세팅
USER root
# User root로 등록
WORKDIR /root
#작업 디렉토리 설정
EXPOSE 40001
# 노출포트 
RUN mkdir -p /opt/apps/ingress-router
# 컨테이너 내 실행명령어 RUN을 통해 mkdir 한거임
COPY . /opt/apps/ingress-router
# cp 내가복사할 파일 복사한파일위치할경로
CMD ln -sf /usr/share/zoneinfo/Asia/Seoul /etc/localtime && cd /opt/apps/ingress-router && npm start
#시간 설정 시작명령어
