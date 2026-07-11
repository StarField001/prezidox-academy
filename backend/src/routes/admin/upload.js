const router = require('express').Router();
const multer = require('multer');
const { requireAdmin } = require('../../middleware/adminAuth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

router.use(requireAdmin);

// Configure Cloudinary if credentials are present (persistent CDN hosting).
let cloudinary = null;
try {
  if (process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary = require('cloudinary').v2;
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key:    process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
    }
  }
} catch (e) { cloudinary = null; }

// POST /api/admin/upload/image — returns { url }
router.post('/image', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided.' });
    const mime = req.file.mimetype || '';
    if (!/^image\//.test(mime)) return res.status(400).json({ error: 'File must be an image.' });

    const dataUri = `data:${mime};base64,${req.file.buffer.toString('base64')}`;

    if (cloudinary) {
      try {
        const result = await cloudinary.uploader.upload(dataUri, { folder: 'prezidox/blog', resource_type: 'image' });
        return res.json({ url: result.secure_url, host: 'cloudinary' });
      } catch (e) {
        console.error('[upload] cloudinary failed, using inline data URI:', e.message);
      }
    }
    // Fallback: inline data URI. Always works; larger payload, so best for small images.
    return res.json({ url: dataUri, host: 'inline' });
  } catch (err) { next(err); }
});

module.exports = router;
