# 전략 수익 통계 기능 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자별 전략 수익 통계 — 누적 자산 추이(원금 라인 포함), 사이클 단위 성과, 전략 유형 간 비교, S&P500/QQQ 벤치마크 대비 — 를 kista-api 집계 API + kista-ui `/stats` 페이지로 구현한다.

**Architecture:** kista-api에 `GET /api/stats/{summary,equity-curve,cycles}` 3개 엔드포인트를 Hexagonal 패턴으로 추가한다. 수익 계산은 기존 `strategy_cycle`(start/end_amount)·`cycle_position`(일별 스냅샷) 근사 기준. 벤치마크 지수 종가는 신규 `market_index_prices` 테이블에 Alpaca Market Data API로 lazy backfill. kista-ui는 `entities/stats` 슬라이스 + `widgets/stats-overview` + `app/(main)/stats` 페이지로 소비한다.

**Tech Stack:** Java 21 / Spring Boot 3 / Flyway / Mockito·MockRestServiceServer (kista-api), Next.js 16 / React Query / recharts / Vitest (kista-ui)

**Spec:** `docs/superpowers/specs/2026-07-17-strategy-stats-design.md`

## Global Constraints

- 저장소 2개: Task 1~5는 `/Users/phs/workspace/kista/kista-api`, Task 6~9는 `/Users/phs/workspace/kista/kista-ui`에서 실행·커밋한다. 커밋은 각 저장소에서 따로 만든다.
- git author: `narafu <narafu@kakao.com>` — 커밋 전 `git config user.name`/`user.email` 확인. 커밋 메시지는 한글. `git push` 금지(사용자 요청 시에만).
- kista-api: 4-space 들여쓰기, 불변 값 record, 생성자 주입, 가능하면 package-private. domain/은 Spring·JPA 어노테이션 금지. Controller에 try/catch 금지.
- kista-ui: 싱글 쿼트, 세미콜론 없음, import 중괄호 공백 유지, `any` 금지, 인라인 style 금지(CSS 토큰 예외). FSD 단방향 의존(app→widgets→features→entities→shared).
- kista-api 검증: `./gradlew compileJava` + `./gradlew test --tests '<클래스>'`. kista-ui 검증: `npm run typecheck` + `npm run test:run`.
- 로컬 kista-api 서버 임의 기동 금지(실데이터 DB). 이미 떠 있을 때만 활용.
- 금액 계산은 BigDecimal, scale=2 HALF_UP. 날짜 정책: DB의 미국 거래일은 원본 저장, API 반환 시 KST +1일 (`TradeDateConverter.toKst`).

---

## Part A — kista-api (cwd: `/Users/phs/workspace/kista/kista-api`)

### Task 1: market_index_prices 테이블 + IndexPrice 도메인 + 영속성 3종

**Files:**
- Create: `src/main/resources/db/migration/V25__create_market_index_prices.sql`
- Create: `src/main/java/com/kista/domain/model/stats/IndexPrice.java`
- Create: `src/main/java/com/kista/domain/port/out/IndexPricePort.java`
- Create: `src/main/java/com/kista/adapter/out/persistence/marketindex/MarketIndexPriceEntity.java`
- Create: `src/main/java/com/kista/adapter/out/persistence/marketindex/MarketIndexPriceJpaRepository.java`
- Create: `src/main/java/com/kista/adapter/out/persistence/marketindex/MarketIndexPricePersistenceAdapter.java`

**Interfaces:**
- Produces: `IndexPrice(String symbol, LocalDate tradeDate, BigDecimal close)` — tradeDate는 **미국 거래일 원본**
- Produces: `IndexPricePort` — `findBySymbolAndRange(symbol, from, to)`, `findMaxTradeDate(symbol)`, `saveAll(List<IndexPrice>)`

- [ ] **Step 1: 마이그레이션 작성**

먼저 최신 버전 확인: `ls src/main/resources/db/migration/ | sort -V | tail -1` — 현재 V24. V25가 이미 있으면 다음 번호 사용.

```sql
-- V25__create_market_index_prices.sql
-- 벤치마크 지수(SPY/QQQ) 일별 종가 캐시 — Alpaca Market Data lazy backfill
CREATE TABLE market_index_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(10) NOT NULL,
    trade_date DATE NOT NULL, -- 미국 거래일 원본 (KST 변환은 반환 시)
    close_price NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_market_index_prices_symbol_date UNIQUE (symbol, trade_date)
);
```

주의: V1__init.sql의 기존 테이블 DDL 스타일(UUID 기본값 함수명, TIMESTAMPTZ 표기)을 열어 동일하게 맞출 것 — `gen_random_uuid()`가 아니라 다른 함수를 쓰고 있다면 그쪽을 따른다.

- [ ] **Step 2: 도메인 record + 포트**

```java
// src/main/java/com/kista/domain/model/stats/IndexPrice.java
package com.kista.domain.model.stats;

import java.math.BigDecimal;
import java.time.LocalDate;

// 벤치마크 지수 일별 종가 — tradeDate는 미국 거래일 원본 (KST 변환은 소비처에서)
public record IndexPrice(String symbol, LocalDate tradeDate, BigDecimal close) {}
```

```java
// src/main/java/com/kista/domain/port/out/IndexPricePort.java
package com.kista.domain.port.out;

import com.kista.domain.model.stats.IndexPrice;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface IndexPricePort {
    // symbol의 [from, to] 구간 종가 (trade_date 오름차순)
    List<IndexPrice> findBySymbolAndRange(String symbol, LocalDate from, LocalDate to);

    // 저장된 마지막 거래일 — 없으면 empty (lazy backfill 시작점 판단)
    Optional<LocalDate> findMaxTradeDate(String symbol);

    void saveAll(List<IndexPrice> prices);
}
```

- [ ] **Step 3: 영속성 3종 (feargreed 패키지 패턴 그대로)**

```java
// src/main/java/com/kista/adapter/out/persistence/marketindex/MarketIndexPriceEntity.java
package com.kista.adapter.out.persistence.marketindex;

import com.kista.adapter.out.persistence.BaseCreatedAtEntity;
import com.kista.domain.model.stats.IndexPrice;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(
    name = "market_index_prices",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_market_index_prices_symbol_date",
        columnNames = {"symbol", "trade_date"}
    )
)
@Getter
@NoArgsConstructor
class MarketIndexPriceEntity extends BaseCreatedAtEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "symbol", nullable = false, length = 10)
    private String symbol;

    @Column(name = "trade_date", nullable = false)
    private LocalDate tradeDate;

    @Column(name = "close_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal closePrice;

    static MarketIndexPriceEntity from(IndexPrice price) {
        MarketIndexPriceEntity entity = new MarketIndexPriceEntity();
        entity.symbol = price.symbol();
        entity.tradeDate = price.tradeDate();
        entity.closePrice = price.close();
        return entity;
    }

    IndexPrice toDomain() {
        return new IndexPrice(symbol, tradeDate, closePrice);
    }
}
```

```java
// src/main/java/com/kista/adapter/out/persistence/marketindex/MarketIndexPriceJpaRepository.java
package com.kista.adapter.out.persistence.marketindex;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface MarketIndexPriceJpaRepository extends JpaRepository<MarketIndexPriceEntity, UUID> {
    List<MarketIndexPriceEntity> findBySymbolAndTradeDateBetweenOrderByTradeDateAsc(
            String symbol, LocalDate from, LocalDate to);

    Optional<MarketIndexPriceEntity> findTop1BySymbolOrderByTradeDateDesc(String symbol);
}
```

```java
// src/main/java/com/kista/adapter/out/persistence/marketindex/MarketIndexPricePersistenceAdapter.java
package com.kista.adapter.out.persistence.marketindex;

import com.kista.domain.model.stats.IndexPrice;
import com.kista.domain.port.out.IndexPricePort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class MarketIndexPricePersistenceAdapter implements IndexPricePort {

    private final MarketIndexPriceJpaRepository repository;

    @Override
    public List<IndexPrice> findBySymbolAndRange(String symbol, LocalDate from, LocalDate to) {
        return repository.findBySymbolAndTradeDateBetweenOrderByTradeDateAsc(symbol, from, to)
                .stream().map(MarketIndexPriceEntity::toDomain).toList();
    }

    @Override
    public Optional<LocalDate> findMaxTradeDate(String symbol) {
        return repository.findTop1BySymbolOrderByTradeDateDesc(symbol)
                .map(MarketIndexPriceEntity::getTradeDate);
    }

    @Override
    public void saveAll(List<IndexPrice> prices) {
        repository.saveAll(prices.stream().map(MarketIndexPriceEntity::from).toList());
    }
}
```

- [ ] **Step 4: 컴파일 확인**

Run: `./gradlew compileJava`
Expected: BUILD SUCCESSFUL

- [ ] **Step 5: 커밋**

```bash
git add src/main/resources/db/migration/V25__create_market_index_prices.sql src/main/java/com/kista/domain/model/stats/ src/main/java/com/kista/domain/port/out/IndexPricePort.java src/main/java/com/kista/adapter/out/persistence/marketindex/
git commit -m "feat: 벤치마크 지수 종가 테이블 및 영속성 계층 추가"
```

---

### Task 2: AlpacaIndexPriceAdapter (지수 시세 fetch)

**Files:**
- Modify: `src/main/java/com/kista/adapter/out/alpaca/AlpacaProperties.java`
- Modify: `src/main/resources/application.yml` (alpaca 섹션, 104행 근처)
- Create: `src/main/java/com/kista/domain/port/out/IndexPriceFeedPort.java`
- Create: `src/main/java/com/kista/adapter/out/alpaca/AlpacaIndexPriceAdapter.java`
- Test: `src/test/java/com/kista/adapter/out/alpaca/AlpacaIndexPriceAdapterTest.java`

**Interfaces:**
- Consumes: `IndexPrice` (Task 1)
- Produces: `IndexPriceFeedPort.fetchDailyCloses(String symbol, LocalDate from, LocalDate to) : List<IndexPrice>`

- [ ] **Step 1: 실패하는 테스트 작성**

```java
// src/test/java/com/kista/adapter/out/alpaca/AlpacaIndexPriceAdapterTest.java
package com.kista.adapter.out.alpaca;

import com.kista.domain.model.stats.IndexPrice;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class AlpacaIndexPriceAdapterTest {

    private final RestTemplate restTemplate = new RestTemplate();
    private final AlpacaProperties properties = new AlpacaProperties(
            "https://paper-api.alpaca.markets", "test-key", "test-secret", "https://data.test");
    private final AlpacaIndexPriceAdapter adapter = new AlpacaIndexPriceAdapter(restTemplate, properties);

    @Test
    void 일별_종가를_미국_거래일로_변환해_반환한다() {
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        // t는 UTC — 2024-01-02T05:00:00Z = 뉴욕 2024-01-02 00:00 (미국 거래일 2024-01-02)
        server.expect(requestTo(org.hamcrest.Matchers.startsWith("https://data.test/v2/stocks/SPY/bars")))
                .andExpect(header("APCA-API-KEY-ID", "test-key"))
                .andRespond(withSuccess("""
                        {"bars":[{"t":"2024-01-02T05:00:00Z","c":470.12},
                                 {"t":"2024-01-03T05:00:00Z","c":468.55}],
                         "symbol":"SPY","next_page_token":null}
                        """, MediaType.APPLICATION_JSON));

        List<IndexPrice> result = adapter.fetchDailyCloses(
                "SPY", LocalDate.of(2024, 1, 1), LocalDate.of(2024, 1, 5));

        assertThat(result).containsExactly(
                new IndexPrice("SPY", LocalDate.of(2024, 1, 2), new BigDecimal("470.12")),
                new IndexPrice("SPY", LocalDate.of(2024, 1, 3), new BigDecimal("468.55")));
    }

    @Test
    void bars가_null이면_빈_목록을_반환한다() {
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        server.expect(requestTo(org.hamcrest.Matchers.startsWith("https://data.test")))
                .andRespond(withSuccess("{\"bars\":null,\"symbol\":\"SPY\"}", MediaType.APPLICATION_JSON));

        assertThat(adapter.fetchDailyCloses("SPY", LocalDate.of(2024, 1, 1), LocalDate.of(2024, 1, 5)))
                .isEmpty();
    }
}
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `./gradlew test --tests 'AlpacaIndexPriceAdapterTest'`
Expected: 컴파일 오류 — `AlpacaIndexPriceAdapter`, `IndexPriceFeedPort` 미정의, `AlpacaProperties` 생성자 인자 4개 불일치

- [ ] **Step 3: 구현**

```java
// src/main/java/com/kista/adapter/out/alpaca/AlpacaProperties.java — dataBaseUrl 필드 추가
package com.kista.adapter.out.alpaca;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "alpaca")
public record AlpacaProperties(String baseUrl, String apiKey, String apiSecret, String dataBaseUrl) {}
```

(기존 파일의 `@ConfigurationProperties` prefix는 실제 파일 확인 후 유지 — 필드만 추가한다.)

`application.yml`의 alpaca 섹션에 한 줄 추가:

```yaml
alpaca:
  base-url: https://paper-api.alpaca.markets
  data-base-url: https://data.alpaca.markets
```

```java
// src/main/java/com/kista/domain/port/out/IndexPriceFeedPort.java
package com.kista.domain.port.out;

import com.kista.domain.model.stats.IndexPrice;

import java.time.LocalDate;
import java.util.List;

// 외부 시세 제공자에서 지수 일별 종가 조회 (Alpaca)
public interface IndexPriceFeedPort {
    List<IndexPrice> fetchDailyCloses(String symbol, LocalDate from, LocalDate to);
}
```

```java
// src/main/java/com/kista/adapter/out/alpaca/AlpacaIndexPriceAdapter.java
package com.kista.adapter.out.alpaca;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.kista.domain.model.stats.IndexPrice;
import com.kista.domain.port.out.IndexPriceFeedPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class AlpacaIndexPriceAdapter implements IndexPriceFeedPort {

    private static final ZoneId NEW_YORK = ZoneId.of("America/New_York");

    private final RestTemplate alpacaRestTemplate;
    private final AlpacaProperties alpacaProperties;

    // Alpaca Market Data /v2/stocks/{symbol}/bars — 일봉 limit 10000이면 약 40년치라 페이지네이션 불필요
    @Override
    public List<IndexPrice> fetchDailyCloses(String symbol, LocalDate from, LocalDate to) {
        String url = UriComponentsBuilder
                .fromHttpUrl(alpacaProperties.dataBaseUrl() + "/v2/stocks/" + symbol + "/bars")
                .queryParam("timeframe", "1Day")
                .queryParam("start", from.toString())
                .queryParam("end", to.toString())
                .queryParam("adjustment", "split")
                .queryParam("feed", "iex")
                .queryParam("limit", 10000)
                .toUriString();

        HttpHeaders headers = new HttpHeaders();
        headers.set("APCA-API-KEY-ID", alpacaProperties.apiKey());
        headers.set("APCA-API-SECRET-KEY", alpacaProperties.apiSecret());

        BarsResponse response = alpacaRestTemplate.exchange(
                url, HttpMethod.GET, new HttpEntity<>(headers), BarsResponse.class).getBody();
        List<Bar> bars = response != null && response.bars() != null ? response.bars() : List.of();
        log.info("{} 지수 종가 {}건 수신 ({} ~ {})", symbol, bars.size(), from, to);
        return bars.stream()
                .map(bar -> new IndexPrice(
                        symbol,
                        Instant.parse(bar.t()).atZone(NEW_YORK).toLocalDate(),
                        bar.c()))
                .toList();
    }

    record Bar(@JsonProperty("t") String t, @JsonProperty("c") BigDecimal c) {}

    record BarsResponse(@JsonProperty("bars") List<Bar> bars,
                        @JsonProperty("next_page_token") String nextPageToken) {}
}
```

주의: `AlpacaProperties` 생성자 인자가 늘어나므로 기존 사용처 컴파일 오류를 확인한다(설정 바인딩이라 보통 없음). `alpaca.data-base-url`은 `application-local.yml`·배포 환경에 별도 키 필요 없음 — `application.yml` 기본값으로 충분.

- [ ] **Step 4: 테스트 통과 확인**

Run: `./gradlew test --tests 'AlpacaIndexPriceAdapterTest'`
Expected: PASS (2 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/main/java/com/kista/adapter/out/alpaca/ src/main/java/com/kista/domain/port/out/IndexPriceFeedPort.java src/main/resources/application.yml src/test/java/com/kista/adapter/out/alpaca/
git commit -m "feat: Alpaca 지수 일별 종가 어댑터 추가"
```

---

### Task 3: 포트 확장 — 사용자 스코프 사이클·스냅샷 배치 조회

**Files:**
- Modify: `src/main/java/com/kista/domain/port/out/StrategyCyclePort.java`
- Modify: `src/main/java/com/kista/adapter/out/persistence/strategy/StrategyCycleJpaRepository.java`
- Modify: `src/main/java/com/kista/adapter/out/persistence/strategy/StrategyCyclePersistenceAdapter.java`
- Modify: `src/main/java/com/kista/domain/port/out/CyclePositionPort.java`
- Modify: `src/main/java/com/kista/adapter/out/persistence/strategy/CyclePositionJpaRepository.java`
- Modify: `src/main/java/com/kista/adapter/out/persistence/strategy/CyclePositionPersistenceAdapter.java`

**Interfaces:**
- Produces: `StrategyCyclePort.findByStrategyIds(Collection<UUID>) : List<StrategyCycle>` — 삭제 제외, createdAt 오름차순
- Produces: `CyclePositionPort.findByUserAndRange(UUID userId, Instant from, Instant to) : List<CyclePosition>` — created_at 오름차순 (CyclePosition은 strategyCycleId 포함)

- [ ] **Step 1: 포트 인터페이스에 메서드 추가**

`StrategyCyclePort.java`에 추가:

```java
    // 여러 전략의 전체 사이클 배치 조회 (통계용) — deleted 제외, createdAt 오름차순
    List<StrategyCycle> findByStrategyIds(java.util.Collection<UUID> strategyIds);
```

`CyclePositionPort.java`에 추가:

```java
    // 사용자 스코프 스냅샷 범위 조회 (통계 equity curve용) — created_at 오름차순
    List<CyclePosition> findByUserAndRange(UUID userId, Instant from, Instant to);
```

- [ ] **Step 2: JpaRepository 쿼리 추가**

`StrategyCycleJpaRepository.java` — 기존 메서드 스타일 확인 후 추가 (엔티티에 `deletedAt` 필드 존재):

```java
    List<StrategyCycleEntity> findByStrategyIdInAndDeletedAtIsNullOrderByCreatedAtAsc(
            java.util.Collection<UUID> strategyIds);
```

`CyclePositionJpaRepository.java` — 기존 `findRecentByUserId`(50~60행)의 native JOIN을 그대로 복제하고 범위 조건·정렬만 변경:

```java
    // 사용자 스코프 범위 조회 (통계 — created_at 오름차순, native)
    @Query(value = """
            SELECT cp.* FROM cycle_position cp
            JOIN strategy_cycle sc ON cp.strategy_cycle_id = sc.id
            JOIN strategy s ON sc.strategy_id = s.id
            JOIN accounts a ON s.account_id = a.id
            WHERE a.user_id = :userId
              AND cp.created_at >= :from AND cp.created_at < :to
              AND cp.deleted_at IS NULL AND sc.deleted_at IS NULL AND s.deleted_at IS NULL AND a.deleted_at IS NULL
            ORDER BY cp.created_at ASC
            """, nativeQuery = true)
    List<CyclePositionEntity> findByUserIdAndRange(
            @Param("userId") UUID userId, @Param("from") Instant from, @Param("to") Instant to);
```

- [ ] **Step 3: PersistenceAdapter 구현 추가**

`StrategyCyclePersistenceAdapter.java` — 기존 `toDomain` 매핑 메서드를 재사용해:

```java
    @Override
    public List<StrategyCycle> findByStrategyIds(Collection<UUID> strategyIds) {
        if (strategyIds.isEmpty()) return List.of();
        return cycleRepo.findByStrategyIdInAndDeletedAtIsNullOrderByCreatedAtAsc(strategyIds)
                .stream().map(StrategyCycleEntity::toDomain).toList();
    }
```

(필드명 `cycleRepo`와 `toDomain` 메서드명은 실제 파일을 열어 기존 명명을 따른다 — entity 정적/인스턴스 변환 메서드가 다른 이름이면 그것을 사용.)

`CyclePositionPersistenceAdapter.java`:

```java
    @Override
    public List<CyclePosition> findByUserAndRange(UUID userId, Instant from, Instant to) {
        return positionRepo.findByUserIdAndRange(userId, from, to)
                .stream().map(CyclePositionEntity::toDomain).toList();
    }
```

(마찬가지로 기존 CyclePositionEntity → CyclePosition 변환 메서드명을 확인해 따른다.)

- [ ] **Step 4: 컴파일 확인**

Run: `./gradlew compileJava`
Expected: BUILD SUCCESSFUL. 주의 — `CyclePositionPort`/`StrategyCyclePort`를 mock하는 기존 테스트는 인터페이스 메서드 추가로 깨지지 않는다(Mockito mock은 미구현 메서드 자동 처리). `./gradlew compileTestJava`도 함께 확인.

- [ ] **Step 5: 커밋**

```bash
git add src/main/java/com/kista/domain/port/out/ src/main/java/com/kista/adapter/out/persistence/strategy/
git commit -m "feat: 통계용 사용자 스코프 사이클·스냅샷 배치 조회 포트 추가"
```

---

### Task 4: stats 도메인 모델 + StatsService + 단위 테스트

**Files:**
- Create: `src/main/java/com/kista/domain/model/stats/StrategyTypeStats.java`
- Create: `src/main/java/com/kista/domain/model/stats/StatsSummary.java`
- Create: `src/main/java/com/kista/domain/model/stats/EquityPoint.java`
- Create: `src/main/java/com/kista/domain/model/stats/EquityCurve.java`
- Create: `src/main/java/com/kista/domain/model/stats/CyclePerformance.java`
- Create: `src/main/java/com/kista/domain/model/stats/CyclePerformancePage.java`
- Create: `src/main/java/com/kista/domain/port/in/UserStatsUseCase.java`
- Create: `src/main/java/com/kista/application/service/stats/StatsService.java`
- Test: `src/test/java/com/kista/application/service/stats/StatsServiceTest.java`

**Interfaces:**
- Consumes: Task 1 `IndexPrice`/`IndexPricePort`, Task 2 `IndexPriceFeedPort`, Task 3 포트 확장
- Produces: `UserStatsUseCase` — `getSummary(UUID userId)`, `getEquityCurve(UUID userId, LocalDate from, LocalDate to, String benchmarkSymbol)`, `getCyclePerformances(UUID userId, Strategy.Type type, Instant cursor, int size)`

- [ ] **Step 0: VR recurring 확인**

Run: `grep -rn "recurringAmount" src/main/java/com/kista/application/service/trading/ | head -20`
목적: 적립금이 **사이클 도중** usd_deposit에 가산되는 경로가 있는지 확인. 롤오버 시 새 사이클 startAmount에만 반영되면 사이클 실현손익(end−start)은 왜곡 없음. 사이클 도중 가산이 확인되면 StatsService 계산은 그대로 두되(근사 허용), `CyclePerformance` 주석과 이 계획서 실행 노트에 왜곡 가능성을 기록한다 — 차감 로직은 만들지 않는다(YAGNI).

- [ ] **Step 1: 도메인 record 작성**

```java
// src/main/java/com/kista/domain/model/stats/StrategyTypeStats.java
package com.kista.domain.model.stats;

import com.kista.domain.model.strategy.Strategy;

import java.math.BigDecimal;

// 전략 타입별 사이클 성과 집계 — 비율 필드는 종료 사이클이 없으면 null
public record StrategyTypeStats(
        Strategy.Type type,
        int closedCycleCount,
        int activeCycleCount,
        BigDecimal winRate,         // 수익 사이클 비율 0~1 (scale 4)
        BigDecimal avgReturnRate,   // 평균 수익률 (scale 4)
        BigDecimal avgDurationDays, // 평균 소요일 (scale 1)
        BigDecimal realizedPnl,     // 누적 실현손익 USD
        BigDecimal unrealizedPnl    // 진행 중 미실현 평가손익 USD
) {}
```

```java
// src/main/java/com/kista/domain/model/stats/StatsSummary.java
package com.kista.domain.model.stats;

import java.math.BigDecimal;
import java.util.List;

public record StatsSummary(
        BigDecimal totalRealizedPnl,
        BigDecimal totalUnrealizedPnl,
        BigDecimal activePrincipal, // 진행 중 사이클 startAmount 합
        List<StrategyTypeStats> byType
) {}
```

```java
// src/main/java/com/kista/domain/model/stats/EquityPoint.java
package com.kista.domain.model.stats;

import java.math.BigDecimal;
import java.time.LocalDate;

// 일별 전략 운용 자산 스냅샷 합산 (KST 거래일 기준)
public record EquityPoint(LocalDate date, BigDecimal totalAsset, BigDecimal principal) {}
```

```java
// src/main/java/com/kista/domain/model/stats/EquityCurve.java
package com.kista.domain.model.stats;

import java.util.List;

// benchmark의 tradeDate는 KST 변환(+1일) 완료 상태
public record EquityCurve(List<EquityPoint> points, List<IndexPrice> benchmark) {}
```

```java
// src/main/java/com/kista/domain/model/stats/CyclePerformance.java
package com.kista.domain.model.stats;

import com.kista.domain.model.strategy.Strategy;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

// 사이클 1개의 성과 — 진행 중이면 endAmount=최신 스냅샷 평가액, closed=false
// 근사 한계: 수수료 미반영. VR 적립금이 사이클 도중 가산되면 pnl이 과대평가될 수 있음
public record CyclePerformance(
        UUID cycleId,
        Strategy.Type strategyType,
        Strategy.Ticker ticker,
        LocalDate startDate,
        LocalDate endDate,          // 진행 중이면 null
        BigDecimal startAmount,
        BigDecimal endAmount,       // 진행 중 + 스냅샷 없으면 null
        BigDecimal pnl,             // endAmount 없으면 null
        BigDecimal returnRate,      // scale 4, endAmount 없으면 null
        Integer durationDays,       // 진행 중이면 오늘(KST) 기준
        boolean closed,
        Instant createdAt           // 커서 페이지네이션 키
) {}
```

```java
// src/main/java/com/kista/domain/model/stats/CyclePerformancePage.java
package com.kista.domain.model.stats;

import java.time.Instant;
import java.util.List;

public record CyclePerformancePage(List<CyclePerformance> items, Instant nextCursor, boolean hasMore) {}
```

```java
// src/main/java/com/kista/domain/port/in/UserStatsUseCase.java
package com.kista.domain.port.in;

import com.kista.domain.model.stats.CyclePerformancePage;
import com.kista.domain.model.stats.EquityCurve;
import com.kista.domain.model.stats.StatsSummary;
import com.kista.domain.model.strategy.Strategy;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public interface UserStatsUseCase {
    StatsSummary getSummary(UUID userId);

    // from/to null 허용 (null이면 전체/오늘), benchmarkSymbol: "SPY"|"QQQ"
    EquityCurve getEquityCurve(UUID userId, LocalDate from, LocalDate to, String benchmarkSymbol);

    // type null이면 전체
    CyclePerformancePage getCyclePerformances(UUID userId, Strategy.Type type, Instant cursor, int size);
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

기존 서비스 테스트 스타일(`src/test/java/com/kista/application/service/account/AccountServiceTest.java`)을 먼저 열어 어노테이션 구성(@ExtendWith(MockitoExtension.class) 등)을 맞춘다. 핵심 케이스:

```java
// src/test/java/com/kista/application/service/stats/StatsServiceTest.java
package com.kista.application.service.stats;

import com.kista.domain.model.account.Account;
import com.kista.domain.model.stats.*;
import com.kista.domain.model.strategy.CyclePosition;
import com.kista.domain.model.strategy.Strategy;
import com.kista.domain.model.strategy.StrategyCycle;
import com.kista.domain.port.out.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StatsServiceTest {

    @Mock AccountPort accountPort;
    @Mock StrategyPort strategyPort;
    @Mock StrategyCyclePort strategyCyclePort;
    @Mock CyclePositionPort cyclePositionPort;
    @Mock IndexPricePort indexPricePort;
    @Mock IndexPriceFeedPort indexPriceFeedPort;
    @InjectMocks StatsService statsService;

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID ACCOUNT_ID = UUID.randomUUID();
    private static final UUID STRATEGY_ID = UUID.randomUUID();

    private static final Strategy STRATEGY = new Strategy(
            STRATEGY_ID, ACCOUNT_ID, Strategy.Type.INFINITE, Strategy.Status.ACTIVE,
            Strategy.Ticker.SOXL, Strategy.CycleSeedType.NONE);

    // Account 생성은 실제 record 시그니처를 열어 맞춘다 — 테스트에는 id()와 소유권만 필요
    private void stubUserWithStrategy() {
        Account account = mock(Account.class);
        when(account.id()).thenReturn(ACCOUNT_ID);
        when(accountPort.findByUserId(USER_ID)).thenReturn(List.of(account));
        when(strategyPort.findByAccountId(ACCOUNT_ID)).thenReturn(List.of(STRATEGY));
    }

    private static StrategyCycle closedCycle(String start, String end, String startDate, String endDate) {
        return new StrategyCycle(UUID.randomUUID(), STRATEGY_ID, null,
                new BigDecimal(start), new BigDecimal(end),
                LocalDate.parse(startDate), LocalDate.parse(endDate),
                Instant.parse(startDate + "T00:00:00Z"), null);
    }

    @Test
    void 종료_사이클_실현손익과_승률을_집계한다() {
        stubUserWithStrategy();
        when(strategyCyclePort.findByStrategyIds(any())).thenReturn(List.of(
                closedCycle("1000.00", "1100.00", "2026-01-01", "2026-01-31"), // +100, 30일
                closedCycle("1000.00", "950.00", "2026-02-01", "2026-02-11")));  // -50, 10일

        StatsSummary summary = statsService.getSummary(USER_ID);

        assertThat(summary.totalRealizedPnl()).isEqualByComparingTo("50.00");
        StrategyTypeStats infinite = summary.byType().get(0);
        assertThat(infinite.type()).isEqualTo(Strategy.Type.INFINITE);
        assertThat(infinite.closedCycleCount()).isEqualTo(2);
        assertThat(infinite.winRate()).isEqualByComparingTo("0.5");
        assertThat(infinite.avgDurationDays()).isEqualByComparingTo("20.0");
    }

    @Test
    void 진행_중_사이클은_최신_스냅샷으로_미실현손익을_계산한다() {
        stubUserWithStrategy();
        StrategyCycle active = new StrategyCycle(UUID.randomUUID(), STRATEGY_ID, null,
                new BigDecimal("1000.00"), null, LocalDate.parse("2026-06-01"), null,
                Instant.parse("2026-06-01T00:00:00Z"), null);
        when(strategyCyclePort.findByStrategyIds(any())).thenReturn(List.of(active));
        // 자산 = 500 + 10 × 55.00 = 1050 → 미실현 +50
        when(cyclePositionPort.findLatestOne(active.id())).thenReturn(Optional.of(
                new CyclePosition(UUID.randomUUID(), active.id(), new BigDecimal("500.00"),
                        new BigDecimal("55.00"), new BigDecimal("50.00"), 10, Instant.now(), null)));

        StatsSummary summary = statsService.getSummary(USER_ID);

        assertThat(summary.totalUnrealizedPnl()).isEqualByComparingTo("50.00");
        assertThat(summary.activePrincipal()).isEqualByComparingTo("1000.00");
    }

    @Test
    void equity_curve는_같은_날_같은_사이클의_최신_스냅샷만_합산한다() {
        stubUserWithStrategy();
        StrategyCycle active = new StrategyCycle(UUID.randomUUID(), STRATEGY_ID, null,
                new BigDecimal("1000.00"), null, LocalDate.parse("2026-06-01"), null,
                Instant.parse("2026-06-01T00:00:00Z"), null);
        when(strategyCyclePort.findByStrategyIds(any())).thenReturn(List.of(active));
        // KST 2026-06-02 (UTC 06-01 20:00 / 06-01 20:30) 스냅샷 2건 — 최신 건만 반영
        when(cyclePositionPort.findByUserAndRange(eq(USER_ID), any(), any())).thenReturn(List.of(
                new CyclePosition(UUID.randomUUID(), active.id(), new BigDecimal("900.00"),
                        new BigDecimal("10.00"), null, 5, Instant.parse("2026-06-01T20:00:00Z"), null),
                new CyclePosition(UUID.randomUUID(), active.id(), new BigDecimal("800.00"),
                        new BigDecimal("10.00"), null, 20, Instant.parse("2026-06-01T20:30:00Z"), null)));
        when(indexPricePort.findMaxTradeDate("SPY")).thenReturn(Optional.of(LocalDate.parse("2026-07-16")));
        when(indexPricePort.findBySymbolAndRange(eq("SPY"), any(), any())).thenReturn(List.of());

        EquityCurve curve = statsService.getEquityCurve(
                USER_ID, LocalDate.parse("2026-06-01"), LocalDate.parse("2026-06-30"), "SPY");

        assertThat(curve.points()).hasSize(1);
        assertThat(curve.points().get(0).date()).isEqualTo(LocalDate.parse("2026-06-02"));
        // 800 + 20 × 10.00 = 1000
        assertThat(curve.points().get(0).totalAsset()).isEqualByComparingTo("1000.00");
        assertThat(curve.points().get(0).principal()).isEqualByComparingTo("1000.00");
    }

    @Test
    void 벤치마크_결손_구간은_피드에서_backfill하고_피드_실패면_저장분만_반환한다() {
        stubUserWithStrategy();
        when(strategyCyclePort.findByStrategyIds(any())).thenReturn(List.of());
        when(cyclePositionPort.findByUserAndRange(any(), any(), any())).thenReturn(List.of());
        when(indexPricePort.findMaxTradeDate("QQQ")).thenReturn(Optional.empty());
        when(indexPriceFeedPort.fetchDailyCloses(eq("QQQ"), any(), any()))
                .thenThrow(new RuntimeException("alpaca down"));
        when(indexPricePort.findBySymbolAndRange(eq("QQQ"), any(), any())).thenReturn(List.of());

        EquityCurve curve = statsService.getEquityCurve(
                USER_ID, LocalDate.parse("2026-06-01"), LocalDate.parse("2026-06-30"), "QQQ");

        assertThat(curve.benchmark()).isEmpty(); // 실패해도 예외 전파 없이 정상 응답
    }

    @Test
    void 지원하지_않는_벤치마크_심볼은_거부한다() {
        org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
                () -> statsService.getEquityCurve(USER_ID, null, null, "TSLA"));
    }

    @Test
    void 사이클_성과_목록은_커서로_페이지네이션한다() {
        stubUserWithStrategy();
        StrategyCycle c1 = closedCycle("1000.00", "1100.00", "2026-01-01", "2026-01-31");
        StrategyCycle c2 = closedCycle("1000.00", "1200.00", "2026-02-01", "2026-02-28");
        when(strategyCyclePort.findByStrategyIds(any())).thenReturn(List.of(c1, c2));

        CyclePerformancePage page = statsService.getCyclePerformances(USER_ID, null, null, 1);

        assertThat(page.items()).hasSize(1);
        assertThat(page.items().get(0).startDate()).isEqualTo(LocalDate.parse("2026-02-01")); // 최신순
        assertThat(page.hasMore()).isTrue();
        assertThat(page.nextCursor()).isEqualTo(c2.createdAt());
    }
}
```

주의: `Strategy.Ticker.SOXL`·`Strategy.CycleSeedType.NONE`·`Account` record 시그니처는 실제 파일을 열어 확인 후 조정한다. `Account`는 record(final)라 `mock(Account.class)`는 inline mock maker에 의존한다 — 기존 테스트들이 Account를 어떻게 만드는지 확인해 실제 인스턴스 생성 헬퍼가 있으면 그것을 쓴다. Mockito는 interface default 메서드(`findLatestOne`)도 mock으로 override하므로 `findLatestOne` 자체를 stub한다 (testing.md 규칙).

- [ ] **Step 3: 테스트 실패 확인**

Run: `./gradlew test --tests 'StatsServiceTest'`
Expected: 컴파일 오류 — `StatsService` 미정의

- [ ] **Step 4: StatsService 구현**

```java
// src/main/java/com/kista/application/service/stats/StatsService.java
package com.kista.application.service.stats;

import com.kista.common.TimeZones;
import com.kista.common.TradeDateConverter;
import com.kista.domain.model.stats.*;
import com.kista.domain.model.strategy.CyclePosition;
import com.kista.domain.model.strategy.Strategy;
import com.kista.domain.model.strategy.StrategyCycle;
import com.kista.domain.port.in.UserStatsUseCase;
import com.kista.domain.port.out.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
class StatsService implements UserStatsUseCase {

    private static final Set<String> BENCHMARK_SYMBOLS = Set.of("SPY", "QQQ");

    private final AccountPort accountPort;
    private final StrategyPort strategyPort;
    private final StrategyCyclePort strategyCyclePort;
    private final CyclePositionPort cyclePositionPort;
    private final IndexPricePort indexPricePort;
    private final IndexPriceFeedPort indexPriceFeedPort;

    // 사이클 + 소속 전략 조인 뷰
    private record CycleView(StrategyCycle cycle, Strategy strategy) {
        boolean closed() {
            return cycle.endAmount() != null && cycle.endDate() != null;
        }

        BigDecimal realizedPnl() {
            return cycle.endAmount().subtract(cycle.startAmount());
        }
    }

    @Override
    public StatsSummary getSummary(UUID userId) {
        List<CycleView> cycles = loadCycles(userId);
        Map<UUID, BigDecimal> unrealizedByCycle = unrealizedByCycle(cycles);

        Map<Strategy.Type, List<CycleView>> byType = cycles.stream()
                .collect(Collectors.groupingBy(v -> v.strategy().type(),
                        () -> new EnumMap<>(Strategy.Type.class), Collectors.toList()));

        List<StrategyTypeStats> typeStats = byType.entrySet().stream()
                .map(e -> toTypeStats(e.getKey(), e.getValue(), unrealizedByCycle))
                .toList();

        BigDecimal totalRealized = sum(typeStats.stream().map(StrategyTypeStats::realizedPnl));
        BigDecimal totalUnrealized = sum(typeStats.stream().map(StrategyTypeStats::unrealizedPnl));
        BigDecimal activePrincipal = sum(cycles.stream()
                .filter(v -> !v.closed()).map(v -> v.cycle().startAmount()));

        return new StatsSummary(totalRealized, totalUnrealized, activePrincipal, typeStats);
    }

    @Override
    public EquityCurve getEquityCurve(UUID userId, LocalDate from, LocalDate to, String benchmarkSymbol) {
        if (!BENCHMARK_SYMBOLS.contains(benchmarkSymbol)) {
            throw new IllegalArgumentException("지원하지 않는 벤치마크 심볼: " + benchmarkSymbol);
        }
        LocalDate effectiveTo = to != null ? to : LocalDate.now(TimeZones.KST);
        Instant fromInstant = from != null
                ? from.atStartOfDay(ZoneOffset.UTC).minus(1, ChronoUnit.DAYS).toInstant() // KST 변환 여유
                : Instant.EPOCH;
        Instant toInstant = effectiveTo.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();

        List<CycleView> cycles = loadCycles(userId);
        List<CyclePosition> positions = cyclePositionPort.findByUserAndRange(userId, fromInstant, toInstant);
        List<EquityPoint> points = buildPoints(cycles, positions, from, effectiveTo);
        List<IndexPrice> benchmark = loadBenchmark(benchmarkSymbol,
                points.isEmpty() ? effectiveTo : points.get(0).date(), effectiveTo);
        return new EquityCurve(points, benchmark);
    }

    @Override
    public CyclePerformancePage getCyclePerformances(UUID userId, Strategy.Type type,
                                                     Instant cursor, int size) {
        List<CycleView> filtered = loadCycles(userId).stream()
                .filter(v -> type == null || v.strategy().type() == type)
                .sorted(Comparator.comparing((CycleView v) -> v.cycle().createdAt()).reversed())
                .filter(v -> cursor == null || v.cycle().createdAt().isBefore(cursor))
                .toList();

        boolean hasMore = filtered.size() > size;
        List<CycleView> pageItems = hasMore ? filtered.subList(0, size) : filtered;
        List<CyclePerformance> items = pageItems.stream().map(this::toPerformance).toList();
        Instant nextCursor = hasMore ? pageItems.get(pageItems.size() - 1).cycle().createdAt() : null;
        return new CyclePerformancePage(items, nextCursor, hasMore);
    }

    // ── private 헬퍼 ─────────────────────────────────────────────────────────

    private List<CycleView> loadCycles(UUID userId) {
        Map<UUID, Strategy> strategies = accountPort.findByUserId(userId).stream()
                .flatMap(a -> strategyPort.findByAccountId(a.id()).stream())
                .collect(Collectors.toMap(Strategy::id, Function.identity()));
        if (strategies.isEmpty()) return List.of();
        return strategyCyclePort.findByStrategyIds(strategies.keySet()).stream()
                .map(c -> new CycleView(c, strategies.get(c.strategyId())))
                .toList();
    }

    // 진행 중 사이클의 미실현 = 최신 스냅샷 자산 − startAmount (스냅샷 없으면 제외)
    private Map<UUID, BigDecimal> unrealizedByCycle(List<CycleView> cycles) {
        Map<UUID, BigDecimal> result = new HashMap<>();
        for (CycleView v : cycles) {
            if (v.closed()) continue;
            cyclePositionPort.findLatestOne(v.cycle().id()).ifPresent(pos ->
                    result.put(v.cycle().id(), assetOf(pos).subtract(v.cycle().startAmount())));
        }
        return result;
    }

    private StrategyTypeStats toTypeStats(Strategy.Type type, List<CycleView> views,
                                          Map<UUID, BigDecimal> unrealizedByCycle) {
        List<CycleView> closed = views.stream().filter(CycleView::closed).toList();
        List<CycleView> active = views.stream().filter(v -> !v.closed()).toList();

        BigDecimal realizedPnl = sum(closed.stream().map(CycleView::realizedPnl));
        BigDecimal unrealizedPnl = sum(active.stream()
                .map(v -> unrealizedByCycle.getOrDefault(v.cycle().id(), BigDecimal.ZERO)));

        BigDecimal winRate = null;
        BigDecimal avgReturnRate = null;
        BigDecimal avgDurationDays = null;
        if (!closed.isEmpty()) {
            long wins = closed.stream().filter(v -> v.realizedPnl().signum() > 0).count();
            winRate = BigDecimal.valueOf(wins)
                    .divide(BigDecimal.valueOf(closed.size()), 4, RoundingMode.HALF_UP);
            avgReturnRate = closed.stream()
                    .map(v -> v.realizedPnl().divide(v.cycle().startAmount(), 6, RoundingMode.HALF_UP))
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(BigDecimal.valueOf(closed.size()), 4, RoundingMode.HALF_UP);
            long totalDays = closed.stream()
                    .mapToLong(v -> ChronoUnit.DAYS.between(v.cycle().startDate(), v.cycle().endDate()))
                    .sum();
            avgDurationDays = BigDecimal.valueOf(totalDays)
                    .divide(BigDecimal.valueOf(closed.size()), 1, RoundingMode.HALF_UP);
        }
        return new StrategyTypeStats(type, closed.size(), active.size(),
                winRate, avgReturnRate, avgDurationDays, realizedPnl, unrealizedPnl);
    }

    // 날짜(KST)별 사이클 최신 스냅샷 carry-forward 합산.
    // 사이클 종료일 이후에는 해당 사이클을 자산·원금에서 제외한다.
    private List<EquityPoint> buildPoints(List<CycleView> cycles, List<CyclePosition> positions,
                                          LocalDate from, LocalDate to) {
        Map<UUID, CycleView> cycleById = cycles.stream()
                .collect(Collectors.toMap(v -> v.cycle().id(), Function.identity()));

        // positions는 created_at 오름차순 — 날짜별로 사이클당 마지막 스냅샷이 남는다
        TreeMap<LocalDate, Map<UUID, CyclePosition>> byDate = new TreeMap<>();
        for (CyclePosition pos : positions) {
            LocalDate date = pos.createdAt().atZone(TimeZones.KST).toLocalDate();
            byDate.computeIfAbsent(date, d -> new HashMap<>()).put(pos.strategyCycleId(), pos);
        }

        Map<UUID, CyclePosition> latest = new HashMap<>(); // carry-forward 상태
        List<EquityPoint> points = new ArrayList<>();
        for (var entry : byDate.entrySet()) {
            LocalDate date = entry.getKey();
            latest.putAll(entry.getValue());
            if (from != null && date.isBefore(from)) continue;
            if (date.isAfter(to)) break;

            BigDecimal asset = BigDecimal.ZERO;
            BigDecimal principal = BigDecimal.ZERO;
            for (var posEntry : latest.entrySet()) {
                CycleView view = cycleById.get(posEntry.getKey());
                if (view == null) continue;
                LocalDate endDate = view.cycle().endDate();
                if (endDate != null && date.isAfter(endDate)) continue; // 종료 사이클 탈락
                asset = asset.add(assetOf(posEntry.getValue()));
                principal = principal.add(view.cycle().startAmount());
            }
            points.add(new EquityPoint(date,
                    asset.setScale(2, RoundingMode.HALF_UP),
                    principal.setScale(2, RoundingMode.HALF_UP)));
        }
        return points;
    }

    // 결손 구간 lazy backfill 후 KST 변환해 반환 — 피드 실패는 저장분으로 폴백
    private List<IndexPrice> loadBenchmark(String symbol, LocalDate fromKst, LocalDate toKst) {
        // KST 표시일 → 미국 거래일 (−1일)
        LocalDate fromUs = fromKst.minusDays(1);
        LocalDate toUs = toKst.minusDays(1);
        try {
            LocalDate fetchFrom = indexPricePort.findMaxTradeDate(symbol)
                    .map(max -> max.plusDays(1)).orElse(fromUs);
            if (fetchFrom.isAfter(fromUs)) {
                // 저장 구간 앞쪽 결손(최초 조회가 과거로 확장된 경우)도 채운다
                List<IndexPrice> stored = indexPricePort.findBySymbolAndRange(symbol, fromUs, toUs);
                if (!stored.isEmpty() && stored.get(0).tradeDate().isAfter(fromUs)) {
                    indexPricePort.saveAll(indexPriceFeedPort.fetchDailyCloses(
                            symbol, fromUs, stored.get(0).tradeDate().minusDays(1)));
                }
            }
            if (!fetchFrom.isAfter(toUs)) {
                indexPricePort.saveAll(indexPriceFeedPort.fetchDailyCloses(symbol, fetchFrom, toUs));
            }
        } catch (Exception e) {
            log.warn("벤치마크 {} backfill 실패 — 저장분으로 응답: {}", symbol, e.getMessage());
        }
        return indexPricePort.findBySymbolAndRange(symbol, fromUs, toUs).stream()
                .map(p -> new IndexPrice(p.symbol(), TradeDateConverter.toKst(p.tradeDate()), p.close()))
                .toList();
    }

    private static BigDecimal assetOf(CyclePosition pos) {
        BigDecimal unitPrice = pos.closingPrice() != null ? pos.closingPrice()
                : pos.avgPrice() != null ? pos.avgPrice() : BigDecimal.ZERO;
        return pos.usdDeposit().add(unitPrice.multiply(BigDecimal.valueOf(pos.holdings())))
                .setScale(2, RoundingMode.HALF_UP);
    }

    private CyclePerformance toPerformance(CycleView v) {
        StrategyCycle c = v.cycle();
        BigDecimal endAmount = v.closed() ? c.endAmount()
                : cyclePositionPort.findLatestOne(c.id()).map(StatsService::assetOf).orElse(null);
        BigDecimal pnl = endAmount != null ? endAmount.subtract(c.startAmount()) : null;
        BigDecimal returnRate = pnl != null
                ? pnl.divide(c.startAmount(), 4, RoundingMode.HALF_UP) : null;
        LocalDate durationEnd = v.closed() ? c.endDate() : LocalDate.now(TimeZones.KST);
        return new CyclePerformance(c.id(), v.strategy().type(), v.strategy().ticker(),
                c.startDate(), c.endDate(), c.startAmount(), endAmount, pnl, returnRate,
                (int) ChronoUnit.DAYS.between(c.startDate(), durationEnd), v.closed(), c.createdAt());
    }

    private static BigDecimal sum(java.util.stream.Stream<BigDecimal> stream) {
        return stream.reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
    }
}
```

주의: `TradeDateConverter.toKst`의 실제 시그니처(LocalDate → LocalDate인지)를 열어 확인하고, 다르면 `usDate.plusDays(1)` 직접 계산으로 대체하되 주석으로 정책 출처를 남긴다.

- [ ] **Step 5: 테스트 통과 확인**

Run: `./gradlew test --tests 'StatsServiceTest'`
Expected: PASS (6 tests)

- [ ] **Step 6: 커밋**

```bash
git add src/main/java/com/kista/domain/model/stats/ src/main/java/com/kista/domain/port/in/UserStatsUseCase.java src/main/java/com/kista/application/service/stats/ src/test/java/com/kista/application/service/stats/
git commit -m "feat: 사용자 수익 통계 집계 서비스 추가"
```

---

### Task 5: StatsController + Response DTO + WebMvcTest

**Files:**
- Create: `src/main/java/com/kista/adapter/in/web/StatsController.java`
- Create: `src/main/java/com/kista/adapter/in/web/dto/StatsSummaryResponse.java`
- Create: `src/main/java/com/kista/adapter/in/web/dto/EquityCurveResponse.java`
- Create: `src/main/java/com/kista/adapter/in/web/dto/CyclePerformancePageResponse.java`
- Test: `src/test/java/com/kista/adapter/in/web/StatsControllerTest.java`

**Interfaces:**
- Consumes: `UserStatsUseCase` (Task 4)
- Produces (kista-ui가 소비할 JSON):
  - `GET /api/stats/summary` → `{ totalRealizedPnl, totalUnrealizedPnl, activePrincipal, byType: [{ type, closedCycleCount, activeCycleCount, winRate, avgReturnRate, avgDurationDays, realizedPnl, unrealizedPnl }] }`
  - `GET /api/stats/equity-curve?from&to&benchmark` → `{ points: [{ date, totalAsset, principal }], benchmark: [{ date, close }] }`
  - `GET /api/stats/cycles?type&cursor&size` → `{ items: [{ cycleId, strategyType, ticker, startDate, endDate, startAmount, endAmount, pnl, returnRate, durationDays, closed }], nextCursor, hasMore }`

- [ ] **Step 1: 실패하는 테스트 작성**

testing.md의 @WebMvcTest 규칙 준수: `@Execution(ExecutionMode.SAME_THREAD)`, `@WithMockUser` 금지 — `authentication(new UsernamePasswordAuthenticationToken(UUID, null, List.of()))` 패턴, `@MockitoBean UserStatsUseCase`. 기존 `DashboardControllerTest`(있다면)를 열어 import·구성을 맞춘다.

```java
// src/test/java/com/kista/adapter/in/web/StatsControllerTest.java
package com.kista.adapter.in.web;

import com.kista.domain.model.stats.*;
import com.kista.domain.model.strategy.Strategy;
import com.kista.domain.port.in.UserStatsUseCase;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(StatsController.class)
@Execution(ExecutionMode.SAME_THREAD)
class StatsControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean UserStatsUseCase userStats;

    private static final UUID USER_ID = UUID.randomUUID();

    private static UsernamePasswordAuthenticationToken auth() {
        return new UsernamePasswordAuthenticationToken(USER_ID, null, List.of());
    }

    @Test
    void summary를_반환한다() throws Exception {
        when(userStats.getSummary(USER_ID)).thenReturn(new StatsSummary(
                new BigDecimal("50.00"), new BigDecimal("10.00"), new BigDecimal("1000.00"),
                List.of(new StrategyTypeStats(Strategy.Type.INFINITE, 2, 1,
                        new BigDecimal("0.5000"), new BigDecimal("0.0250"), new BigDecimal("20.0"),
                        new BigDecimal("50.00"), new BigDecimal("10.00")))));

        mockMvc.perform(get("/api/stats/summary").with(authentication(auth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRealizedPnl").value(50.00))
                .andExpect(jsonPath("$.byType[0].type").value("INFINITE"))
                .andExpect(jsonPath("$.byType[0].winRate").value(0.5));
    }

    @Test
    void equity_curve를_반환한다() throws Exception {
        when(userStats.getEquityCurve(eq(USER_ID), any(), any(), eq("QQQ")))
                .thenReturn(new EquityCurve(
                        List.of(new EquityPoint(LocalDate.parse("2026-06-02"),
                                new BigDecimal("1000.00"), new BigDecimal("900.00"))),
                        List.of(new IndexPrice("QQQ", LocalDate.parse("2026-06-02"),
                                new BigDecimal("450.00")))));

        mockMvc.perform(get("/api/stats/equity-curve")
                        .param("from", "2026-06-01").param("to", "2026-06-30")
                        .param("benchmark", "QQQ")
                        .with(authentication(auth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.points[0].date").value("2026-06-02"))
                .andExpect(jsonPath("$.points[0].totalAsset").value(1000.00))
                .andExpect(jsonPath("$.benchmark[0].close").value(450.00));
    }

    @Test
    void 잘못된_벤치마크_심볼은_400을_반환한다() throws Exception {
        when(userStats.getEquityCurve(eq(USER_ID), any(), any(), eq("TSLA")))
                .thenThrow(new IllegalArgumentException("지원하지 않는 벤치마크 심볼"));

        mockMvc.perform(get("/api/stats/equity-curve").param("benchmark", "TSLA")
                        .with(authentication(auth())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void cycles를_커서와_함께_반환한다() throws Exception {
        var createdAt = java.time.Instant.parse("2026-02-01T00:00:00Z");
        when(userStats.getCyclePerformances(eq(USER_ID), isNull(), isNull(), eq(50)))
                .thenReturn(new CyclePerformancePage(
                        List.of(new CyclePerformance(UUID.randomUUID(), Strategy.Type.INFINITE,
                                Strategy.Ticker.SOXL, LocalDate.parse("2026-01-01"),
                                LocalDate.parse("2026-01-31"), new BigDecimal("1000.00"),
                                new BigDecimal("1100.00"), new BigDecimal("100.00"),
                                new BigDecimal("0.1000"), 30, true, createdAt)),
                        createdAt, true));

        mockMvc.perform(get("/api/stats/cycles").with(authentication(auth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].closed").value(true))
                .andExpect(jsonPath("$.nextCursor").value("2026-02-01T00:00:00Z"))
                .andExpect(jsonPath("$.hasMore").value(true));
    }
}
```

`IllegalArgumentException → 400` 매핑이 `GlobalExceptionHandler`에 이미 있는지 확인 (BrokerAdapterRegistry가 동일 예외를 400으로 쓰므로 있을 것). `@WebMvcTest` 슬라이스에 `GlobalExceptionHandler`가 로드되지 않으면 `@Import(GlobalExceptionHandler.class)` 추가.

- [ ] **Step 2: 테스트 실패 확인**

Run: `./gradlew test --tests 'StatsControllerTest'`
Expected: 컴파일 오류 — `StatsController` 미정의

- [ ] **Step 3: DTO + 컨트롤러 구현**

```java
// src/main/java/com/kista/adapter/in/web/dto/StatsSummaryResponse.java
package com.kista.adapter.in.web.dto;

import com.kista.domain.model.stats.StatsSummary;
import com.kista.domain.model.stats.StrategyTypeStats;

import java.math.BigDecimal;
import java.util.List;

public record StatsSummaryResponse(
        BigDecimal totalRealizedPnl,
        BigDecimal totalUnrealizedPnl,
        BigDecimal activePrincipal,
        List<TypeStats> byType
) {
    public record TypeStats(
            String type, String typeDescription,
            int closedCycleCount, int activeCycleCount,
            BigDecimal winRate, BigDecimal avgReturnRate, BigDecimal avgDurationDays,
            BigDecimal realizedPnl, BigDecimal unrealizedPnl
    ) {
        static TypeStats from(StrategyTypeStats s) {
            return new TypeStats(s.type().name(), s.type().getDescription(),
                    s.closedCycleCount(), s.activeCycleCount(),
                    s.winRate(), s.avgReturnRate(), s.avgDurationDays(),
                    s.realizedPnl(), s.unrealizedPnl());
        }
    }

    public static StatsSummaryResponse from(StatsSummary summary) {
        return new StatsSummaryResponse(summary.totalRealizedPnl(), summary.totalUnrealizedPnl(),
                summary.activePrincipal(),
                summary.byType().stream().map(TypeStats::from).toList());
    }
}
```

```java
// src/main/java/com/kista/adapter/in/web/dto/EquityCurveResponse.java
package com.kista.adapter.in.web.dto;

import com.kista.domain.model.stats.EquityCurve;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record EquityCurveResponse(List<Point> points, List<BenchmarkPoint> benchmark) {

    public record Point(LocalDate date, BigDecimal totalAsset, BigDecimal principal) {}

    public record BenchmarkPoint(LocalDate date, BigDecimal close) {}

    public static EquityCurveResponse from(EquityCurve curve) {
        return new EquityCurveResponse(
                curve.points().stream()
                        .map(p -> new Point(p.date(), p.totalAsset(), p.principal())).toList(),
                curve.benchmark().stream()
                        .map(b -> new BenchmarkPoint(b.tradeDate(), b.close())).toList());
    }
}
```

```java
// src/main/java/com/kista/adapter/in/web/dto/CyclePerformancePageResponse.java
package com.kista.adapter.in.web.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.kista.domain.model.stats.CyclePerformance;
import com.kista.domain.model.stats.CyclePerformancePage;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CyclePerformancePageResponse(
        List<Item> items,
        @JsonInclude(JsonInclude.Include.NON_NULL) String nextCursor,
        boolean hasMore
) {
    public record Item(
            UUID cycleId, String strategyType, String ticker,
            LocalDate startDate, LocalDate endDate,
            BigDecimal startAmount, BigDecimal endAmount,
            BigDecimal pnl, BigDecimal returnRate, Integer durationDays, boolean closed
    ) {
        static Item from(CyclePerformance p) {
            return new Item(p.cycleId(), p.strategyType().name(),
                    p.ticker() != null ? p.ticker().name() : null,
                    p.startDate(), p.endDate(), p.startAmount(), p.endAmount(),
                    p.pnl(), p.returnRate(), p.durationDays(), p.closed());
        }
    }

    public static CyclePerformancePageResponse from(CyclePerformancePage page) {
        return new CyclePerformancePageResponse(
                page.items().stream().map(Item::from).toList(),
                page.nextCursor() != null ? page.nextCursor().toString() : null,
                page.hasMore());
    }
}
```

```java
// src/main/java/com/kista/adapter/in/web/StatsController.java
package com.kista.adapter.in.web;

import com.kista.adapter.in.web.dto.CyclePerformancePageResponse;
import com.kista.adapter.in.web.dto.EquityCurveResponse;
import com.kista.adapter.in.web.dto.StatsSummaryResponse;
import com.kista.domain.model.strategy.Strategy;
import com.kista.domain.port.in.UserStatsUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Tag(name = "통계", description = "사용자 전략 수익 통계 (DB 근사 집계)")
@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class StatsController {

    private final UserStatsUseCase userStats;

    @Operation(summary = "수익 통계 요약", description = "실현·미실현 손익과 전략 타입별 사이클 성과 집계.")
    @GetMapping("/summary")
    public StatsSummaryResponse getSummary(@AuthenticationPrincipal UUID userId) {
        return StatsSummaryResponse.from(userStats.getSummary(userId));
    }

    @Operation(summary = "누적 자산 곡선", description = "일별 전략 운용 자산·원금 + 벤치마크 지수 종가 (KST 거래일).")
    @GetMapping("/equity-curve")
    public EquityCurveResponse getEquityCurve(
            @AuthenticationPrincipal UUID userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "SPY") String benchmark) {
        return EquityCurveResponse.from(userStats.getEquityCurve(userId, from, to, benchmark));
    }

    @Operation(summary = "사이클 성과 목록", description = "종료·진행 중 사이클의 손익/수익률/소요일 (커서 페이지네이션).")
    @GetMapping("/cycles")
    public CyclePerformancePageResponse getCycles(
            @AuthenticationPrincipal UUID userId,
            @RequestParam(required = false) Strategy.Type type,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "50") int size) {
        Instant cursorInstant = cursor != null ? Instant.parse(cursor) : null;
        return CyclePerformancePageResponse.from(
                userStats.getCyclePerformances(userId, type, cursorInstant, Math.min(size, 200)));
    }
}
```

`Strategy.Type.getDescription()` 접근자 이름은 실제 enum(@Getter 롬복)을 확인 — `getDescription()`이 맞다.

- [ ] **Step 4: 테스트 통과 + 전체 회귀 확인**

Run: `./gradlew test --tests 'StatsControllerTest'` → PASS (4 tests)
Run: `./gradlew test` → 기존 테스트 포함 BUILD SUCCESSFUL (오래 걸리면 `compileTestJava` 후 신규 테스트만이라도)

- [ ] **Step 5: 커밋**

```bash
git add src/main/java/com/kista/adapter/in/web/ src/test/java/com/kista/adapter/in/web/StatsControllerTest.java
git commit -m "feat: 수익 통계 API 엔드포인트 3종 추가"
```

---

## Part B — kista-ui (cwd: `/Users/phs/workspace/kista/kista-ui`)

> openapi 타입: 로컬 kista-api가 **이미 떠 있으면** `npm run fetch:spec && npm run gen:types` 실행. 아니면 스킵 — entities 타입은 아래처럼 수동 정의(기존 `entities/trade` 패턴과 동일).

### Task 6: entities/stats 슬라이스

**Files:**
- Create: `entities/stats/model/types.ts`
- Create: `entities/stats/api/index.ts`
- Create: `entities/stats/hooks/useStatsQueries.ts`
- Create: `entities/stats/index.ts`
- Test: `entities/stats/api/index.test.ts`

**Interfaces:**
- Consumes: Task 5의 JSON 응답 (필드명 대조 필수)
- Produces: `getStatsSummary(token?)`, `getEquityCurve(params, token?)`, `getStatsCycles(params, token?)`, `useStatsSummaryQuery(initialData?)`, `useEquityCurveQuery(params, initialData?)`, `useStatsCyclesQuery(type)`
- queryKey: `['statsSummary']`, `['equityCurve', from, to, benchmark]`, `['statsCycles', type]`

- [ ] **Step 1: 스캐폴드**

Run: `/fsd-scaffold entities stats` 스킬 사용 가능하면 사용, 아니면 디렉토리 수동 생성.

- [ ] **Step 2: 타입 정의**

```ts
// entities/stats/model/types.ts
export interface StrategyTypeStats {
  type: string
  typeDescription: string
  closedCycleCount: number
  activeCycleCount: number
  winRate: number | null
  avgReturnRate: number | null
  avgDurationDays: number | null
  realizedPnl: number
  unrealizedPnl: number
}

export interface StatsSummary {
  totalRealizedPnl: number
  totalUnrealizedPnl: number
  activePrincipal: number
  byType: StrategyTypeStats[]
}

export interface EquityPoint {
  date: string
  totalAsset: number
  principal: number
}

export interface BenchmarkPoint {
  date: string
  close: number
}

export interface EquityCurve {
  points: EquityPoint[]
  benchmark: BenchmarkPoint[]
}

export type BenchmarkSymbol = 'SPY' | 'QQQ'

export interface CyclePerformance {
  cycleId: string
  strategyType: string
  ticker: string | null
  startDate: string
  endDate: string | null
  startAmount: number
  endAmount: number | null
  pnl: number | null
  returnRate: number | null
  durationDays: number | null
  closed: boolean
}

export interface CyclePerformancePage {
  items: CyclePerformance[]
  nextCursor: string | null
  hasMore: boolean
}
```

- [ ] **Step 3: 실패하는 API 테스트 작성** (`entities/trade/api/index.test.ts`의 mock 패턴을 먼저 열어 그대로 따른다 — fetchEither mock 방식 재사용)

```ts
// entities/stats/api/index.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getEquityCurve, getStatsCycles } from './index'

const fetchEitherMock = vi.hoisted(() => vi.fn())
vi.mock('@shared/lib/api-client', () => ({ fetchEither: fetchEitherMock }))

describe('stats api', () => {
  beforeEach(() => fetchEitherMock.mockReset())

  it('equity-curve 쿼리스트링을 조립한다', async () => {
    fetchEitherMock.mockResolvedValue({ points: [], benchmark: [] })
    await getEquityCurve({ from: '2026-04-01', to: '2026-07-01', benchmark: 'QQQ' })
    expect(fetchEitherMock).toHaveBeenCalledWith(
      '/api/stats/equity-curve?from=2026-04-01&to=2026-07-01&benchmark=QQQ',
      { method: 'GET' },
      undefined
    )
  })

  it('cycles 커서·타입 파라미터를 전달한다', async () => {
    fetchEitherMock.mockResolvedValue({ items: [], nextCursor: null, hasMore: false })
    await getStatsCycles({ type: 'INFINITE', cursor: '2026-02-01T00:00:00Z' })
    expect(fetchEitherMock).toHaveBeenCalledWith(
      '/api/stats/cycles?type=INFINITE&cursor=2026-02-01T00%3A00%3A00Z',
      { method: 'GET' },
      undefined
    )
  })
})
```

- [ ] **Step 4: 실패 확인**

Run: `npm run test:run -- entities/stats`
Expected: FAIL — `./index` 모듈 없음

- [ ] **Step 5: API 함수 + 훅 구현**

```ts
// entities/stats/api/index.ts
import { fetchEither } from '@shared/lib/api-client'
import type {
  BenchmarkSymbol,
  CyclePerformancePage,
  EquityCurve,
  StatsSummary,
} from '../model/types'

export async function getStatsSummary(token?: string): Promise<StatsSummary> {
  return fetchEither<StatsSummary>('/api/stats/summary', { method: 'GET' }, token)
}

export async function getEquityCurve(
  params: { from?: string; to?: string; benchmark: BenchmarkSymbol },
  token?: string
): Promise<EquityCurve> {
  const q = new URLSearchParams()
  if (params.from) q.set('from', params.from)
  if (params.to) q.set('to', params.to)
  q.set('benchmark', params.benchmark)
  return fetchEither<EquityCurve>(`/api/stats/equity-curve?${q}`, { method: 'GET' }, token)
}

export async function getStatsCycles(
  params: { type?: string; cursor?: string; size?: number },
  token?: string
): Promise<CyclePerformancePage> {
  const q = new URLSearchParams()
  if (params.type) q.set('type', params.type)
  if (params.cursor) q.set('cursor', params.cursor)
  if (params.size != null) q.set('size', String(params.size))
  const qs = q.size ? `?${q}` : ''
  return fetchEither<CyclePerformancePage>(`/api/stats/cycles${qs}`, { method: 'GET' }, token)
}
```

```ts
// entities/stats/hooks/useStatsQueries.ts
'use client'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { getEquityCurve, getStatsCycles, getStatsSummary } from '../api'
import type {
  BenchmarkSymbol,
  CyclePerformance,
  CyclePerformancePage,
  EquityCurve,
  StatsSummary,
} from '../model/types'

const EMPTY_CYCLE_PAGE: CyclePerformancePage = { items: [], nextCursor: null, hasMore: false }

export function useStatsSummaryQuery(initialData?: StatsSummary) {
  return useQuery<StatsSummary>({
    queryKey: ['statsSummary'],
    queryFn: () => getStatsSummary(),
    initialData,
  })
}

export interface EquityCurveParams {
  from?: string
  to?: string
  benchmark: BenchmarkSymbol
}

export function useEquityCurveQuery(params: EquityCurveParams, initialData?: EquityCurve) {
  return useQuery<EquityCurve>({
    queryKey: ['equityCurve', params.from, params.to, params.benchmark],
    queryFn: () => getEquityCurve(params),
    initialData,
    placeholderData: (prev) => prev,
  })
}

export function useStatsCyclesQuery(type?: string) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<CyclePerformancePage>({
      queryKey: ['statsCycles', type ?? 'ALL'],
      queryFn: ({ pageParam }) =>
        getStatsCycles({ type, cursor: pageParam as string | undefined }).catch(
          () => EMPTY_CYCLE_PAGE
        ),
      initialPageParam: undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      placeholderData: (prev) => prev,
    })

  const cycles: CyclePerformance[] = data?.pages.flatMap((p) => p.items) ?? []
  return { cycles, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage }
}
```

```ts
// entities/stats/index.ts
export * from './model/types'
export * from './api'
export * from './hooks/useStatsQueries'
```

주의: `initialData` prop이 `undefined`인 경우(서버 페치 실패)에도 클라이언트 refetch가 동작해야 하므로 `initialData` 조건부 전달 그대로 둔다. entities quirk 문서의 queryKey 목록(`docs/agents/entities.md`)에 신규 키 3종을 추가한다.

- [ ] **Step 6: 통과 확인 + 커밋**

Run: `npm run test:run -- entities/stats` → PASS
Run: `npm run typecheck` → 오류 없음

```bash
git add entities/stats docs/agents/entities.md
git commit -m "feat: 수익 통계 entities 슬라이스 추가"
```

---

### Task 7: 곡선 정규화 유틸 (widgets/stats-overview/lib)

**Files:**
- Create: `widgets/stats-overview/lib/normalizeEquityCurve.ts`
- Test: `widgets/stats-overview/lib/normalizeEquityCurve.test.ts`

**Interfaces:**
- Consumes: `EquityPoint`, `BenchmarkPoint` (Task 6)
- Produces: `normalizeEquityCurve(points, benchmark): NormalizedRow[]` — `{ date: string; asset: number; principal: number; benchmark: number | null }`, 자산·원금은 자산 첫 값=100 기준, 벤치마크는 지수 첫 값=100 기준. `excessReturnPp(rows): number | null` — 마지막 행의 (asset − benchmark) %p

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// widgets/stats-overview/lib/normalizeEquityCurve.test.ts
import { describe, it, expect } from 'vitest'
import { normalizeEquityCurve, excessReturnPp } from './normalizeEquityCurve'

const points = [
  { date: '2026-06-01', totalAsset: 1000, principal: 1000 },
  { date: '2026-06-02', totalAsset: 1100, principal: 1000 },
]

describe('normalizeEquityCurve', () => {
  it('자산 첫 값을 100으로 정규화하고 원금도 같은 분모를 쓴다', () => {
    const rows = normalizeEquityCurve(points, [])
    expect(rows[0]).toEqual({ date: '2026-06-01', asset: 100, principal: 100, benchmark: null })
    expect(rows[1].asset).toBeCloseTo(110)
    expect(rows[1].principal).toBeCloseTo(100)
  })

  it('벤치마크는 지수 첫 값 기준 100으로 정규화하고 결손일은 직전 값을 쓴다', () => {
    const rows = normalizeEquityCurve(points, [{ date: '2026-06-01', close: 500 }])
    expect(rows[0].benchmark).toBeCloseTo(100)
    expect(rows[1].benchmark).toBeCloseTo(100) // 06-02 결손 → carry-forward
  })

  it('빈 입력이면 빈 배열', () => {
    expect(normalizeEquityCurve([], [])).toEqual([])
  })

  it('초과수익은 마지막 행의 자산-벤치마크 차이', () => {
    const rows = normalizeEquityCurve(points, [
      { date: '2026-06-01', close: 500 },
      { date: '2026-06-02', close: 525 },
    ])
    expect(excessReturnPp(rows)).toBeCloseTo(110 - 105)
  })

  it('벤치마크가 없으면 초과수익은 null', () => {
    expect(excessReturnPp(normalizeEquityCurve(points, []))).toBeNull()
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test:run -- widgets/stats-overview`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

```ts
// widgets/stats-overview/lib/normalizeEquityCurve.ts
import type { BenchmarkPoint, EquityPoint } from '@entities/stats'

export interface NormalizedRow {
  date: string
  asset: number
  principal: number
  benchmark: number | null
}

// 자산·원금은 자산 첫 값=100, 벤치마크는 지수 첫 값=100으로 정규화.
// 벤치마크 결손일(지수 휴장 등)은 직전 값 carry-forward.
export function normalizeEquityCurve(
  points: EquityPoint[],
  benchmark: BenchmarkPoint[]
): NormalizedRow[] {
  if (points.length === 0) return []
  const assetBase = points[0].totalAsset
  const benchBase = benchmark[0]?.close

  const benchByDate = new Map(benchmark.map((b) => [b.date, b.close]))
  let lastBench: number | null = null

  return points.map((p) => {
    const close = benchByDate.get(p.date)
    if (close != null) lastBench = close
    return {
      date: p.date,
      asset: assetBase > 0 ? (p.totalAsset / assetBase) * 100 : 0,
      principal: assetBase > 0 ? (p.principal / assetBase) * 100 : 0,
      benchmark: benchBase != null && lastBench != null ? (lastBench / benchBase) * 100 : null,
    }
  })
}

export function excessReturnPp(rows: NormalizedRow[]): number | null {
  const last = rows[rows.length - 1]
  if (!last || last.benchmark == null) return null
  return last.asset - last.benchmark
}
```

- [ ] **Step 4: 통과 확인 + 커밋**

Run: `npm run test:run -- widgets/stats-overview` → PASS (5 tests)

```bash
git add widgets/stats-overview/lib
git commit -m "feat: 자산 곡선 정규화 유틸 추가"
```

---

### Task 8: widgets/stats-overview 위젯

**Files:**
- Create: `widgets/stats-overview/StatsKpiRow.tsx`
- Create: `widgets/stats-overview/EquityCurveChart.tsx`
- Create: `widgets/stats-overview/StrategyTypeComparison.tsx`
- Create: `widgets/stats-overview/CyclePerformanceList.tsx`
- Create: `widgets/stats-overview/StatsOverview.tsx`
- Create: `widgets/stats-overview/index.ts`
- Test: `widgets/stats-overview/StatsOverview.test.tsx`

**Interfaces:**
- Consumes: Task 6 훅·타입, Task 7 `normalizeEquityCurve`/`excessReturnPp`, `@widgets/kpi-card`의 `KpiCard`
- Produces: `StatsOverview({ initialSummary, initialCurve, defaultFrom, defaultTo }: { initialSummary?: StatsSummary; initialCurve?: EquityCurve; defaultFrom: string; defaultTo: string })` — 페이지가 렌더할 단일 클라이언트 컴포넌트

**구현 지침 (코드는 기존 위젯 스타일에 맞춰 작성하되 아래 구조를 따른다):**

- [ ] **Step 0: dataviz 스킬 로드** — 차트 색·다크모드 대응 기준. 기존 CSS 토큰(`var(--card)` 등, `FearGreedTrend.tsx` 참고)을 우선 사용한다.

- [ ] **Step 1: 실패하는 렌더 테스트 작성** (기존 `widgets/dashboard/MarketChartCardInner.test.tsx`의 테스트 셋업 — Provider·mock 패턴 — 을 열어 동일하게 구성)

```tsx
// widgets/stats-overview/StatsOverview.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatsOverview } from './StatsOverview'
import type { EquityCurve, StatsSummary } from '@entities/stats'

vi.mock('recharts', async (importOriginal) => {
  const mod = await importOriginal<typeof import('recharts')>()
  return {
    ...mod,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 300 }}>{children}</div>
    ),
  }
})

const SUMMARY: StatsSummary = {
  totalRealizedPnl: 150.5,
  totalUnrealizedPnl: -20,
  activePrincipal: 3000,
  byType: [
    {
      type: 'INFINITE', typeDescription: '무한매수법',
      closedCycleCount: 3, activeCycleCount: 1,
      winRate: 0.6667, avgReturnRate: 0.05, avgDurationDays: 21.5,
      realizedPnl: 150.5, unrealizedPnl: -20,
    },
  ],
}

const CURVE: EquityCurve = {
  points: [
    { date: '2026-06-01', totalAsset: 1000, principal: 1000 },
    { date: '2026-06-02', totalAsset: 1100, principal: 1000 },
  ],
  benchmark: [{ date: '2026-06-01', close: 500 }],
}

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('StatsOverview', () => {
  it('KPI와 전략 비교 테이블을 렌더링한다', () => {
    renderWithClient(
      <StatsOverview initialSummary={SUMMARY} initialCurve={CURVE}
        defaultFrom="2026-04-17" defaultTo="2026-07-17" />
    )
    expect(screen.getByText('총 실현손익')).toBeInTheDocument()
    expect(screen.getByText('무한매수법')).toBeInTheDocument()
  })

  it('데이터가 없으면 empty state를 보여준다', () => {
    renderWithClient(
      <StatsOverview
        initialSummary={{ totalRealizedPnl: 0, totalUnrealizedPnl: 0, activePrincipal: 0, byType: [] }}
        initialCurve={{ points: [], benchmark: [] }}
        defaultFrom="2026-04-17" defaultTo="2026-07-17" />
    )
    expect(screen.getByText(/아직 기록된 사이클이 없습니다/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 실패 확인** — `npm run test:run -- widgets/stats-overview/StatsOverview` → FAIL

- [ ] **Step 3: 위젯 구현** — 구조 요건:

1. **`StatsOverview.tsx`** (`'use client'`): 상태 `benchmark: BenchmarkSymbol`(기본 `'SPY'`), `range: '1M'|'3M'|'6M'|'1Y'|'ALL'`(기본 `'3M'` — `defaultFrom/defaultTo`와 일치). range→from 변환은 컴포넌트 내 순수 함수. `useStatsSummaryQuery(initialSummary)` + `useEquityCurveQuery({ from, to, benchmark }, 초기 파라미터일 때만 initialCurve)` 호출. `summary.byType.length === 0 && points.length === 0`이면 empty state 카드("아직 기록된 사이클이 없습니다 — 전략이 매매를 시작하면 통계가 쌓입니다"). 아니면 `StatsKpiRow` → `EquityCurveChart` → `StrategyTypeComparison` → `CyclePerformanceList` 순 세로 배치. 곡선 하단에 근사 기준 안내 문구: "전략에 배정된 예수금 기준 근사치입니다. 수수료는 반영되지 않습니다." summary 또는 curve 쿼리가 `isError`(초기 데이터도 없음)이면 해당 섹션만 `@widgets/error-display` 위젯으로 대체하고 나머지 섹션은 정상 렌더한다.
2. **`StatsKpiRow.tsx`**: `KpiCard` 4장 그리드(`grid grid-cols-2 lg:grid-cols-4 gap-4`) — 총 실현손익(USD, 부호 색), 미실현 평가손익, 운용 원금, 지수 대비 초과수익(`excessReturnPp` 결과 %p, null이면 '—'). 금액 포맷은 `@shared/lib/format`의 기존 함수(파일을 열어 USD 포맷 함수 확인) 재사용.
3. **`EquityCurveChart.tsx`**: recharts `LineChart` + `normalizeEquityCurve` rows. 선 3개 — 자산(`var(--chart-1)` 없으면 rose 계열 토큰), 원금(점선, muted), 벤치마크(대비색). 상단 우측에 기간 프리셋 버튼 그룹과 SPY/QQQ 토글(shadcn `Tabs` 또는 버튼 — 기존 위젯에서 쓰는 패턴 확인). `benchmark`가 모두 null이면 벤치마크 선 생략 + "지수 데이터를 불러오지 못했습니다" 캡션. Tooltip 스타일은 `FearGreedTrend.tsx`의 contentStyle 그대로.
4. **`StrategyTypeComparison.tsx`**: shadcn `Table` — 열: 전략(typeDescription), 종료/진행 사이클 수, 승률(%), 평균 수익률(%), 평균 소요일, 누적 실현손익, 미실현. null 값은 '—'.
5. **`CyclePerformanceList.tsx`**: `useStatsCyclesQuery(typeFilter)` + "더 보기" 버튼(`hasNextPage`) — `widgets/cycle-history`의 목록·무한스크롤 패턴을 열어 동일하게. 행: 전략 타입 배지, ticker, 기간(startDate~endDate|진행 중), 손익(부호 색), 수익률, 소요일.
6. **`index.ts`**: `export { StatsOverview } from './StatsOverview'`

- [ ] **Step 4: 통과 확인 + 커밋**

Run: `npm run test:run -- widgets/stats-overview` → PASS
Run: `npm run typecheck` → 오류 없음

```bash
git add widgets/stats-overview
git commit -m "feat: 수익 통계 위젯 추가"
```

---

### Task 9: /stats 페이지 + 네비게이션 + 최종 검증

**Files:**
- Create: `app/(main)/stats/page.tsx`
- Modify: `widgets/layout/DesktopSidebar.tsx:12-15` (NAV_ITEMS)
- Modify: `widgets/layout/MobileBottomNav.tsx:10-13` (TABS)

**Interfaces:**
- Consumes: `StatsOverview` (Task 8), `getStatsSummary`/`getEquityCurve` (Task 6), `getAuthToken` (`@shared/lib/auth/token`)

- [ ] **Step 1: 페이지 작성**

```tsx
// app/(main)/stats/page.tsx
import { getAuthToken } from '@shared/lib/auth/token'
import { getEquityCurve, getStatsSummary } from '@entities/stats'
import { StatsOverview } from '@widgets/stats-overview'

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export default async function StatsPage() {
  const token = await getAuthToken()

  const to = new Date()
  const from = new Date(to)
  from.setMonth(from.getMonth() - 3)
  const defaultFrom = isoDate(from)
  const defaultTo = isoDate(to)

  const [summary, curve] = token
    ? await Promise.all([
        getStatsSummary(token).catch(() => undefined),
        getEquityCurve({ from: defaultFrom, to: defaultTo, benchmark: 'SPY' }, token).catch(
          () => undefined
        ),
      ])
    : [undefined, undefined]

  return (
    <StatsOverview
      initialSummary={summary}
      initialCurve={curve}
      defaultFrom={defaultFrom}
      defaultTo={defaultTo}
    />
  )
}
```

(main) 레이아웃의 기존 페이지들(`app/(main)/dashboard/page.tsx`)이 `PageHeader` 위젯을 쓰는지 확인 — 쓰면 동일하게 "통계" 헤더 추가.

- [ ] **Step 2: 네비게이션 추가**

`DesktopSidebar.tsx` NAV_ITEMS(12~15행)와 `MobileBottomNav.tsx` TABS(10~13행)에 각각 추가 (lucide `TrendingUp` import 추가):

```ts
  { href: '/stats',      label: '통계',     icon: TrendingUp },
```

위치: '전략' 다음, '설정' 앞. 모바일 탭 5개는 `flex-1`이라 그대로 수용된다.

- [ ] **Step 3: 정적 검증**

Run: `npm run typecheck` → 오류 없음 (`.next/dev/types` 스테일 오류면 `.next` 삭제 후 재실행)
Run: `npm run test:run` → 전체 PASS

- [ ] **Step 4: 렌더 검증 (조건부)**

로컬 kista-api가 떠 있으면(임의 기동 금지): dev 서버 포트 확인(`cat /tmp/kista_dev.log | grep "Local:"`) 후

Run: `npx playwright screenshot --browser chromium --viewport-size "1440,900" http://localhost:<port>/stats /tmp/stats.png`

스크린샷을 Read로 열어 KPI·차트·테이블 렌더를 눈으로 확인. kista-api가 없으면 비인증 empty 렌더만 확인하고, 완료 보고에 "실데이터 렌더 검증은 로컬 API 기동 후 필요"를 명시한다.

- [ ] **Step 5: 커밋**

```bash
git add "app/(main)/stats" widgets/layout/DesktopSidebar.tsx widgets/layout/MobileBottomNav.tsx
git commit -m "feat: 수익 통계 페이지 및 네비게이션 추가"
```

---

## 실행 후 확인 사항

- [ ] kista-api `./gradlew test` 전체 통과
- [ ] kista-ui `npm run typecheck` + `npm run test:run` 전체 통과
- [ ] fsd-boundary-checker 에이전트로 FSD 위반 점검 (선택)
- [ ] Task 4 Step 0의 VR recurring 조사 결과를 완료 보고에 포함
- [ ] 배포 시 Flyway V25 자동 적용 확인 (별도 수동 작업 없음)
