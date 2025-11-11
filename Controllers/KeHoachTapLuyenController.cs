using Microsoft.AspNetCore.Mvc;

namespace HealthWeb.Controllers
{
    public class KeHoachTapLuyenController : Controller
    {
        public IActionResult Index()
        {
            return View("keHoachTapLuyen");
        }
    }
}


