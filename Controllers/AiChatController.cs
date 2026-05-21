using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Text.Json;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace AI_App.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AiChatController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public AiChatController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        // Sends a prompt to OpenAI Responses API using direct HttpClient call and returns the raw response
        [HttpPost]
        public async Task<string> API([FromForm] string Prompt)
        {
            using HttpClient client = new HttpClient();
            client.DefaultRequestHeaders.Add("Authorization", "Bearer " + _configuration["OpenAI:ApiKey"]);
            var requestBody = new
            {
                model = "gpt-5.4-mini",
                input = Prompt
            };
            var jsonData = JsonSerializer.Serialize(requestBody);
            StringContent content = new StringContent(jsonData, Encoding.UTF8, "application/json");

            var response = await client.PostAsync("https://api.openai.com/v1/responses", content);
            return await response.Content.ReadAsStringAsync();
        }
    }
}
