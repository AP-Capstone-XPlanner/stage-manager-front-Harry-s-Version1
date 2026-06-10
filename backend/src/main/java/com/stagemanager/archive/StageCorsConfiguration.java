package com.stagemanager.archive;

import java.util.Arrays;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class StageCorsConfiguration implements WebMvcConfigurer {

	private final String[] allowedOriginPatterns;

	public StageCorsConfiguration(
			@Value("${stage.cors.allowed-origins:http://localhost:*,http://127.0.0.1:*}") String allowedOrigins) {
		this.allowedOriginPatterns = parseOrigins(allowedOrigins);
	}

	@Override
	public void addCorsMappings(CorsRegistry registry) {
		registry.addMapping("/api/**")
				.allowedOriginPatterns(allowedOriginPatterns)
				.allowedMethods("GET", "POST", "DELETE", "OPTIONS")
				.allowedHeaders("*");
	}

	private String[] parseOrigins(String rawOrigins) {
		String[] origins = Arrays.stream(rawOrigins.split(","))
				.map(String::trim)
				.filter((origin) -> !origin.isEmpty())
				.toArray(String[]::new);
		return origins.length > 0
				? origins
				: new String[] {"http://localhost:*", "http://127.0.0.1:*"};
	}
}
