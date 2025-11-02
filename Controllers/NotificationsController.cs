using Microsoft.AspNetCore.Mvc;

namespace HealthWeb.Controllers
{
    [Route("[controller]")]
    public class NotificationsController : Controller
    {
        [HttpGet("List")]
        public IActionResult List()
        {
            // TODO: Replace with DB query based on current user
            var sample = new[]
            {
                new { title = "Chào mừng bạn đến với HealthWeb!", icon = "fa-heart-pulse", time = "vừa xong" },
                new { title = "Gợi ý hôm nay: Uống thêm 1 ly nước.", icon = "fa-droplet", time = "5 phút trước" },
                new { title = "Bài viết mới: 20’ HIIT đốt mỡ", icon = "fa-person-running", time = "1 giờ trước" }
            };
            return Json(sample);
        }
    }
}


