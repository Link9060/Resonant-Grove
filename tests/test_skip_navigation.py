"""Static regression checks for the keyboard skip-navigation affordance."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SkipNavigationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / "index.html").read_text(encoding="utf-8")

    def test_skip_link_is_first_focusable_element_and_targets_main(self):
        body = self.html.split("<body>", 1)[1]
        first = re.search(r"<(a|button|input|select|textarea)\b[^>]*>", body, re.I)
        self.assertIsNotNone(first)
        self.assertEqual(first.group(1).lower(), "a")
        self.assertIn('href="#mainContent"', first.group(0))
        self.assertIn('class="skip-to-content"', first.group(0))
        self.assertRegex(self.html, r'<main\b[^>]*\bid="mainContent"[^>]*\btabindex="-1"')

    def test_skip_link_has_visible_high_contrast_focus_outline(self):
        focus_rule = re.search(r"\.skip-to-content:focus\s*\{([^}]*)\}", self.html)
        self.assertIsNotNone(focus_rule)
        declarations = focus_rule.group(1)
        self.assertRegex(declarations, r"outline:\s*3px\s+solid\s+#0b110d\s*;")
        self.assertRegex(declarations, r"outline-offset:\s*3px\s*;?")
        base_rule = re.search(r"\.skip-to-content\s*\{([^}]*)\}", self.html)
        self.assertIsNotNone(base_rule)
        self.assertRegex(base_rule.group(1), r"background:\s*#ecf3dc\s*;")

    def test_skip_link_becomes_visible_on_keyboard_focus(self):
        self.assertRegex(self.html, r"\.skip-to-content:focus\s*\{[^}]*transform:\s*translateY\(0\)")
        self.assertRegex(self.html, r"\.skip-to-content\s*\{[^}]*transform:\s*translateY\(-160%\)")


if __name__ == "__main__":
    unittest.main()
