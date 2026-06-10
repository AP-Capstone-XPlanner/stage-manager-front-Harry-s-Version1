package com.stagemanager.archive;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.stream.Stream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

@RestController
@RequestMapping("/api/stage")
public class StageArchiveController {

	private final ObjectMapper objectMapper;
	private final Path archiveDirectory;

	public StageArchiveController(
			ObjectMapper objectMapper,
			@Value("${stage.archive.directory:stage-archives}") String archiveDirectory) throws IOException {
		this.objectMapper = objectMapper;
		this.archiveDirectory = Path.of(archiveDirectory).toAbsolutePath().normalize();
		Files.createDirectories(this.archiveDirectory);
	}

	@GetMapping("/list")
	public ResponseEntity<List<String>> listArchives() throws IOException {
		try (Stream<Path> files = Files.list(archiveDirectory)) {
			List<String> archives = files
					.filter(Files::isRegularFile)
					.map((path) -> path.getFileName().toString())
					.filter((name) -> name.endsWith(".json"))
					.map((name) -> name.substring(0, name.length() - ".json".length()))
					.sorted(String.CASE_INSENSITIVE_ORDER)
					.toList();
			return ResponseEntity.ok(archives);
		}
	}

	@PostMapping("/save")
	public ResponseEntity<String> saveArchive(@RequestBody ObjectNode request) throws IOException {
		String sceneName = request.path("sceneName").asText("").trim();
		if (sceneName.isEmpty()) {
			return ResponseEntity.badRequest().body("sceneName is required");
		}
		if (!request.path("propsData").isArray()) {
			return ResponseEntity.badRequest().body("propsData array is required");
		}

		request.put("sceneName", sceneName);
		request.put("savedAt", Instant.now().toString());
		objectMapper.writerWithDefaultPrettyPrinter()
				.writeValue(getArchivePath(sceneName).toFile(), request);

		return ResponseEntity.ok("Saved " + sceneName);
	}

	@GetMapping("/load")
	public ResponseEntity<JsonNode> loadArchive(@RequestParam String name) throws IOException {
		Path archivePath = getArchivePath(name);
		if (!Files.isRegularFile(archivePath)) {
			return ResponseEntity.notFound().build();
		}
		return ResponseEntity.ok(objectMapper.readTree(archivePath.toFile()));
	}

	@DeleteMapping("/delete")
	public ResponseEntity<String> deleteArchive(@RequestParam String name) throws IOException {
		Path archivePath = getArchivePath(name);
		if (!Files.deleteIfExists(archivePath)) {
			return ResponseEntity.notFound().build();
		}
		return ResponseEntity.ok("Deleted " + name);
	}

	private Path getArchivePath(String sceneName) {
		String fileName = sanitizeSceneName(sceneName) + ".json";
		Path path = archiveDirectory.resolve(fileName).normalize();
		if (!path.startsWith(archiveDirectory)) {
			throw new IllegalArgumentException("Invalid archive name");
		}
		return path;
	}

	private String sanitizeSceneName(String sceneName) {
		String sanitized = sceneName.trim()
				.replaceAll("[\\\\/:*?\"<>|]+", "-")
				.replaceAll("\\s+", " ")
				.replaceAll("^\\.+", "")
				.trim();
		if (sanitized.isEmpty()) {
			return "stage-" + Instant.now().toEpochMilli();
		}
		return sanitized.toLowerCase(Locale.ROOT).equals("con") ? "stage-con" : sanitized;
	}
}
