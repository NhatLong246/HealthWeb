using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Text;
using System.Text.Json;

namespace HealthWeb.Controllers
{
    [ApiController]
    [Route("Chat")]
    [Authorize]
    public class ChatController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<ChatController> _logger;
        private readonly HttpClient _httpClient;

        public ChatController(IConfiguration configuration, ILogger<ChatController> logger, IHttpClientFactory httpClientFactory)
        {
            _configuration = configuration;
            _logger = logger;
            _httpClient = httpClientFactory.CreateClient();
        }

        [HttpPost("SendMessage")]
        public async Task<IActionResult> SendMessage([FromBody] ChatRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request?.Message))
                {
                    return BadRequest(new { success = false, error = "Message is required" });
                }

                var apiKey = _configuration["OpenAI:ApiKey"];
                if (string.IsNullOrEmpty(apiKey))
                {
                    _logger.LogError("OpenAI API key is not configured");
                    return StatusCode(500, new { success = false, error = "Chat service is not configured" });
                }

                // Prepare the request to OpenAI API
                var openAiRequest = new
                {
                    model = "gpt-3.5-turbo",
                    messages = new[]
                    {
                        new
                        {
                            role = "system",
                            content = "Bạn là trợ lý AI thân thiện của HealthWeb, một ứng dụng chăm sóc sức khỏe. " +
                                     "Bạn chuyên về dinh dưỡng, luyện tập, sức khỏe tổng quát và mục tiêu sức khỏe. " +
                                     "Hãy trả lời bằng tiếng Việt một cách ngắn gọn, dễ hiểu và hữu ích. " +
                                     "Nếu câu hỏi không liên quan đến sức khỏe, hãy nhẹ nhàng hướng người dùng về chủ đề sức khỏe."
                        },
                        new
                        {
                            role = "user",
                            content = request.Message
                        }
                    },
                    max_tokens = 500,
                    temperature = 0.7
                };

                var jsonContent = JsonSerializer.Serialize(openAiRequest);
                var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

                _httpClient.DefaultRequestHeaders.Clear();
                _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");

                var response = await _httpClient.PostAsync("https://api.openai.com/v1/chat/completions", content);

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("OpenAI API error: {StatusCode} - {Error}", response.StatusCode, errorContent);
                    return StatusCode(500, new { success = false, error = "Failed to get response from AI" });
                }

                var responseContent = await response.Content.ReadAsStringAsync();
                var jsonResponse = JsonSerializer.Deserialize<JsonElement>(responseContent);

                if (jsonResponse.TryGetProperty("choices", out var choices) && choices.GetArrayLength() > 0)
                {
                    var firstChoice = choices[0];
                    if (firstChoice.TryGetProperty("message", out var message) &&
                        message.TryGetProperty("content", out var contentElement))
                    {
                        var aiResponse = contentElement.GetString();
                        return Ok(new { success = true, response = aiResponse });
                    }
                }

                return StatusCode(500, new { success = false, error = "Invalid response from AI" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing chat message");
                return StatusCode(500, new { success = false, error = "An error occurred while processing your message" });
            }
        }
    }

    public class ChatRequest
    {
        public string Message { get; set; } = string.Empty;
    }
}

