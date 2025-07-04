class EntryNotificationChecker {
  constructor() {
    this.checkInterval = null;
    this.isRunning = false;
    this.init();
  }

  init() {
    // 페이지가 완전히 로드된 후 시작
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.start());
    } else {
      this.start();
    }
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // 즉시 한 번 실행
    this.checkNotifications();
    
    // 2초마다 반복 실행
    this.checkInterval = setInterval(() => {
      this.checkNotifications();
    }, 2000);
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
  }

  async checkNotifications() {
    try {
      // CSRF 토큰을 동적으로 가져오기 시도
      const csrfToken = this.getCSRFToken();
      
      const response = await fetch("https://playentry.org/graphql/SELECT_TOPICS", {
        "headers": {
          "accept": "*/*",
          "accept-language": "en-US,en;q=0.9,ja;q=0.8,ko;q=0.7",
          "content-type": "application/json",
          "csrf-token": csrfToken || "EMvcMIYO-MDDGX0LNQK-LutKuU2GVDFVfezQ",
          "priority": "u=1, i",
          "sec-ch-ua": "\"Chromium\";v=\"140\", \"Not=A?Brand\";v=\"24\", \"Google Chrome\";v=\"140\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "\"Linux\"",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "x-client-type": "Client"
        },
        "referrer": "https://playentry.org/community/entrystory/list?sort=created&term=all",
        "body": JSON.stringify({
          "query": `
            query SELECT_TOPICS($pageParam: PageParam, $searchAfter: JSON){
              topicList(pageParam: $pageParam, searchAfter: $searchAfter) {
                searchAfter
                list {
                  id
                  params
                  template
                  thumbUrl
                  category
                  target
                  isRead
                  created
                  updated
                  link {
                    category
                    target
                    hash
                    groupId
                  }
                  topicinfo {
                    category
                    targetId
                  }
                }
              }
            }
          `,
          "variables": {
            "pageParam": {
              "display": 20
            }
          }
        }),
        "method": "POST",
        "mode": "cors",
        "credentials": "include"
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      this.processNotificationData(data);
      
    } catch (error) {
      // 오류 발생 시 조용히 넘어감
    }
  }

  getCSRFToken() {
    // 페이지에서 CSRF 토큰을 찾는 시도
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
      return metaTag.getAttribute('content');
    }
    
    // 쿠키에서 찾는 시도
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'csrf-token' || name === '_token') {
        return value;
      }
    }
    
    return null;
  }

  processNotificationData(data) {
    try {
      const topics = data?.data?.topicList?.list || [];
      const hasUnreadNotifications = topics.some(topic => topic.isRead === false);
      
      this.updateNotificationIndicator(hasUnreadNotifications);
      
    } catch (error) {
      // 오류 발생 시 조용히 넘어감
    }
  }

  updateNotificationIndicator(hasUnreadNotifications) {
    // 대상 요소들 찾기
    const targetSelectors = [
      'a[role="button"].css-mop10c.e5hayu94',
      'a[role="button"].css-19v6b81.e1d9fkcw2'
    ];
    
    let targetElement = null;
    for (const selector of targetSelectors) {
      targetElement = document.querySelector(selector);
      if (targetElement) break;
    }
    
    if (!targetElement) return;

    // alarm 스팬 찾기 (em 밖에 있는 span.blind 중에서 alarm을 포함하는 것)
    const allSpans = targetElement.querySelectorAll('span.blind');
    let alarmSpan = null;
    
    for (const span of allSpans) {
      // em 태그 안에 있지 않고 alarm을 포함하는 span 찾기
      if (!span.closest('em') && span.textContent.includes('alarm')) {
        alarmSpan = span;
        break;
      }
    }
    
    if (!alarmSpan) return;

    // 기존 New 표시 찾기 (간단하게 em 요소만 확인)
    const existingNewIndicator = targetElement.querySelector('em');
    const hasNewIndicator = !!existingNewIndicator;

    if (hasUnreadNotifications) {
      // 읽지 않은 알림이 있으면 New 표시 추가
      if (!hasNewIndicator) {
        const newIndicator = document.createElement('em');
        const newSpan = document.createElement('span');
        newSpan.className = 'blind';
        newSpan.textContent = 'New';
        newIndicator.appendChild(newSpan);
        
        // alarm 스팬 앞에 삽입
        alarmSpan.parentNode.insertBefore(newIndicator, alarmSpan);
      }
    } else {
      // 읽지 않은 알림이 없으면 New 표시 제거
      if (hasNewIndicator) {
        existingNewIndicator.remove();
      }
    }
  }
}

// 확장 프로그램 시작
const notificationChecker = new EntryNotificationChecker();

// 페이지 이동 시 정리
window.addEventListener('beforeunload', () => {
  notificationChecker.stop();
}); 