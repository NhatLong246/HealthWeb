using Microsoft.AspNetCore.Mvc;

namespace HealthWeb.Controllers
{
    public class MucTieuController : Controller
    {
        [Route("/MucTieu")]
        public IActionResult Index()
        {
            return View("MucTieu");
        }
    }
}
