package com.ktc4.pusan4.judgment.rule;

import com.ktc4.pusan4.judgment.domain.RuleSet;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.nio.file.Path;

/**
 * 기동할 때 규칙 카드를 한 번 읽는다. 읽거나 검증하지 못하면 부팅이 실패한다.
 * 규칙이 없는 서버가 떠서 모든 판정을 실패로 남기는 것보다 배포가 멈추는 편이 낫다.
 */
@Configuration
class RuleSetConfiguration {

    @Bean
    RuleSet ruleSet(@Value("${app.rules.dir}") Path rulesDirectory) throws IOException {
        return new RuleCardLoader().load(rulesDirectory);
    }
}
