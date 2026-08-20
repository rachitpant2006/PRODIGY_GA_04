import React, { useState } from 'react';
import { Code2, Copy, Check, Download, FileCode, Terminal } from 'lucide-react';

export const CodeExportView: React.FC = () => {
  const [copied, setCopied] = useState<boolean>(false);
  const [framework, setFramework] = useState<'pytorch' | 'tensorflow'>('pytorch');

  const pytorchCode = `"""
Pix2Pix (Image-to-Image Translation with Conditional Adversarial Networks)
Paper: Isola et al., CVPR 2017
Complete, Runnable PyTorch Implementation
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from PIL import Image
import torchvision.transforms as transforms
import glob
import os

# ==============================================================================
# 1. U-Net Generator with Skip Connections
# ==============================================================================
class UnetSkipConnectionBlock(nn.Module):
    """
    Defines the submodule with skip connection:
    X -------------------> Concat ----------------->
      |-- Downsampling -- Submodule -- Upsampling --|
    """
    def __init__(self, outer_nc, inner_nc, input_nc=None,
                 submodule=None, outermost=False, innermost=False, norm_layer=nn.BatchNorm2d, use_dropout=False):
        super(UnetSkipConnectionBlock, self).__init__()
        self.outermost = outermost
        if input_nc is None:
            input_nc = outer_nc

        downconv = nn.Conv2d(input_nc, inner_nc, kernel_size=4, stride=2, padding=1, bias=False)
        downrelu = nn.LeakyReLU(0.2, True)
        downnorm = norm_layer(inner_nc)
        uprelu = nn.ReLU(True)
        upnorm = norm_layer(outer_nc)

        if outermost:
            upconv = nn.ConvTranspose2d(inner_nc * 2, outer_nc, kernel_size=4, stride=2, padding=1)
            down = [downconv]
            up = [uprelu, upconv, nn.Tanh()]
            model = down + [submodule] + up
        elif innermost:
            upconv = nn.ConvTranspose2d(inner_nc, outer_nc, kernel_size=4, stride=2, padding=1, bias=False)
            down = [downrelu, downconv]
            up = [uprelu, upconv, upnorm]
            model = down + up
        else:
            upconv = nn.ConvTranspose2d(inner_nc * 2, outer_nc, kernel_size=4, stride=2, padding=1, bias=False)
            down = [downrelu, downconv, downnorm]
            up = [uprelu, upconv, upnorm]
            if use_dropout:
                model = down + [submodule] + up + [nn.Dropout(0.5)]
            else:
                model = down + [submodule] + up

        self.model = nn.Sequential(*model)

    def forward(self, x):
        if self.outermost:
            return self.model(x)
        else:
            # Skip connection: concatenate along channel dimension (dim=1)
            return torch.cat([x, self.model(x)], 1)


class UNetGenerator(nn.Module):
    """256x256 U-Net Generator with 8 downsampling and 8 upsampling layers."""
    def __init__(self, input_nc=3, output_nc=3, num_downs=8, ngf=64, norm_layer=nn.BatchNorm2d, use_dropout=False):
        super(UNetGenerator, self).__init__()
        # Construct U-Net from innermost bottleneck layer outwards
        unet_block = UnetSkipConnectionBlock(ngf * 8, ngf * 8, input_nc=None, submodule=None, innermost=True, norm_layer=norm_layer)
        for _ in range(num_downs - 5):
            unet_block = UnetSkipConnectionBlock(ngf * 8, ngf * 8, input_nc=None, submodule=unet_block, norm_layer=norm_layer, use_dropout=use_dropout)
        unet_block = UnetSkipConnectionBlock(ngf * 4, ngf * 8, input_nc=None, submodule=unet_block, norm_layer=norm_layer)
        unet_block = UnetSkipConnectionBlock(ngf * 2, ngf * 4, input_nc=None, submodule=unet_block, norm_layer=norm_layer)
        unet_block = UnetSkipConnectionBlock(ngf, ngf * 2, input_nc=None, submodule=unet_block, norm_layer=norm_layer)
        self.model = UnetSkipConnectionBlock(output_nc, ngf, input_nc=input_nc, submodule=unet_block, outermost=True, norm_layer=norm_layer)

    def forward(self, input):
        return self.model(input)


# ==============================================================================
# 2. 70x70 PatchGAN Discriminator
# ==============================================================================
class PatchGANDiscriminator(nn.Module):
    """70x70 PatchGAN Discriminator classifies local image patches as Real or Fake."""
    def __init__(self, input_nc=6, ndf=64, n_layers=3, norm_layer=nn.BatchNorm2d):
        super(PatchGANDiscriminator, self).__init__()
        kw = 4
        padw = 1
        sequence = [
            nn.Conv2d(input_nc, ndf, kernel_size=kw, stride=2, padding=padw),
            nn.LeakyReLU(0.2, True)
        ]
        nf_mult = 1
        for n in range(1, n_layers):
            nf_mult_prev = nf_mult
            nf_mult = min(2 ** n, 8)
            sequence += [
                nn.Conv2d(ndf * nf_mult_prev, ndf * nf_mult, kernel_size=kw, stride=2, padding=padw, bias=False),
                norm_layer(ndf * nf_mult),
                nn.LeakyReLU(0.2, True)
            ]

        nf_mult_prev = nf_mult
        nf_mult = min(2 ** n_layers, 8)
        sequence += [
            nn.Conv2d(ndf * nf_mult_prev, ndf * nf_mult, kernel_size=kw, stride=1, padding=padw, bias=False),
            norm_layer(ndf * nf_mult),
            nn.LeakyReLU(0.2, True)
        ]
        # Output 1-channel prediction map (each pixel corresponds to a 70x70 receptive patch)
        sequence += [nn.Conv2d(ndf * nf_mult, 1, kernel_size=kw, stride=1, padding=padw)]
        self.model = nn.Sequential(*sequence)

    def forward(self, input):
        return self.model(input)


# ==============================================================================
# 3. Training Loop & Losses
# ==============================================================================
def train_pix2pix():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Training on device: {device}")

    # Initialize Models
    netG = UNetGenerator(input_nc=3, output_nc=3, num_downs=8, ngf=64, use_dropout=True).to(device)
    netD = PatchGANDiscriminator(input_nc=6, ndf=64, n_layers=3).to(device)

    # Loss Functions & Hyperparameters
    criterionGAN = nn.BCEWithLogitsLoss()
    criterionL1 = nn.L1Loss()
    lambda_L1 = 100.0  # Weight for L1 reconstruction loss

    # Optimizers (Adam with beta1=0.5 as specified in paper)
    optimizer_G = optim.Adam(netG.parameters(), lr=0.0002, betas=(0.5, 0.999))
    optimizer_D = optim.Adam(netD.parameters(), lr=0.0002, betas=(0.5, 0.999))

    # Example single forward-backward step
    # real_A: Condition Image x, real_B: Ground Truth Target y
    real_A = torch.randn(1, 3, 256, 256, device=device)
    real_B = torch.randn(1, 3, 256, 256, device=device)

    # ----------------------
    # 1. Update Discriminator D
    # ----------------------
    optimizer_D.zero_grad()
    # Real pair [real_A, real_B]
    real_AB = torch.cat((real_A, real_B), 1)
    pred_real = netD(real_AB)
    loss_D_real = criterionGAN(pred_real, torch.ones_like(pred_real))

    # Fake pair [real_A, fake_B]
    fake_B = netG(real_A)
    fake_AB = torch.cat((real_A, fake_B.detach()), 1)
    pred_fake = netD(fake_AB)
    loss_D_fake = criterionGAN(pred_fake, torch.zeros_like(pred_fake))

    # Combined D Loss
    loss_D = (loss_D_real + loss_D_fake) * 0.5
    loss_D.backward()
    optimizer_D.step()

    # ----------------------
    # 2. Update Generator G
    # ----------------------
    optimizer_G.zero_grad()
    # G wants D to classify fake_B as Real
    fake_AB = torch.cat((real_A, fake_B), 1)
    pred_fake = netD(fake_AB)
    loss_G_GAN = criterionGAN(pred_fake, torch.ones_like(pred_fake))
    # L1 Loss between fake_B and real_B
    loss_G_L1 = criterionL1(fake_B, real_B) * lambda_L1
    # Total G loss
    loss_G = loss_G_GAN + loss_G_L1
    loss_G.backward()
    optimizer_G.step()

    print(f"Step Complete | D_Loss: {loss_D.item():.4f} | G_GAN: {loss_G_GAN.item():.4f} | G_L1: {loss_G_L1.item():.4f}")

if __name__ == '__main__':
    train_pix2pix()
`;

  const tensorflowCode = `"""
Pix2Pix in TensorFlow 2.x / Keras
U-Net Generator + 70x70 PatchGAN Discriminator + L1 Loss
"""

import tensorflow as tf
from tensorflow.keras import layers

def downsample(filters, size, apply_batchnorm=True):
    initializer = tf.random_normal_initializer(0., 0.02)
    result = tf.keras.Sequential()
    result.add(layers.Conv2D(filters, size, strides=2, padding='same',
                             kernel_initializer=initializer, use_bias=False))
    if apply_batchnorm:
        result.add(layers.BatchNormalization())
    result.add(layers.LeakyReLU(0.2))
    return result

def upsample(filters, size, apply_dropout=False):
    initializer = tf.random_normal_initializer(0., 0.02)
    result = tf.keras.Sequential()
    result.add(layers.Conv2DTranspose(filters, size, strides=2, padding='same',
                                     kernel_initializer=initializer, use_bias=False))
    result.add(layers.BatchNormalization())
    if apply_dropout:
        result.add(layers.Dropout(0.5))
    result.add(layers.ReLU())
    return result

def Generator():
    inputs = layers.Input(shape=[256, 256, 3])
    down_stack = [
        downsample(64, 4, apply_batchnorm=False), # (bs, 128, 128, 64)
        downsample(128, 4),                      # (bs, 64, 64, 128)
        downsample(256, 4),                      # (bs, 32, 32, 256)
        downsample(512, 4),                      # (bs, 16, 16, 512)
        downsample(512, 4),                      # (bs, 8, 8, 512)
        downsample(512, 4),                      # (bs, 4, 4, 512)
        downsample(512, 4),                      # (bs, 2, 2, 512)
        downsample(512, 4),                      # (bs, 1, 1, 512)
    ]
    up_stack = [
        upsample(512, 4, apply_dropout=True),    # (bs, 2, 2, 1024)
        upsample(512, 4, apply_dropout=True),    # (bs, 4, 4, 1024)
        upsample(512, 4, apply_dropout=True),    # (bs, 8, 8, 1024)
        upsample(512, 4),                        # (bs, 16, 16, 1024)
        upsample(256, 4),                        # (bs, 32, 32, 512)
        upsample(128, 4),                        # (bs, 64, 64, 256)
        upsample(64, 4),                         # (bs, 128, 128, 128)
    ]
    last = layers.Conv2DTranspose(3, 4, strides=2, padding='same',
                                  kernel_initializer=tf.random_normal_initializer(0., 0.02),
                                  activation='tanh') # (bs, 256, 256, 3)
    x = inputs
    skips = []
    for down in down_stack:
        x = down(x)
        skips.append(x)
    skips = reversed(skips[:-1])

    for up, skip in zip(up_stack, skips):
        x = up(x)
        x = layers.Concatenate()([x, skip]) # U-Net Skip Connection

    x = last(x)
    return tf.keras.Model(inputs=inputs, outputs=x)

def Discriminator():
    initializer = tf.random_normal_initializer(0., 0.02)
    inp = layers.Input(shape=[256, 256, 3], name='input_image')
    tar = layers.Input(shape=[256, 256, 3], name='target_image')
    x = layers.concatenate([inp, tar]) # (bs, 256, 256, 6)

    down1 = downsample(64, 4, False)(x)
    down2 = downsample(128, 4)(down1)
    down3 = downsample(256, 4)(down2)
    zero_pad1 = layers.ZeroPadding2D()(down3)
    conv = layers.Conv2D(512, 4, strides=1, kernel_initializer=initializer, use_bias=False)(zero_pad1)
    batchnorm1 = layers.BatchNormalization()(conv)
    leaky_relu = layers.LeakyReLU(0.2)(batchnorm1)
    zero_pad2 = layers.ZeroPadding2D()(leaky_relu)
    last = layers.Conv2D(1, 4, strides=1, kernel_initializer=initializer)(zero_pad2)

    return tf.keras.Model(inputs=[inp, tar], outputs=last)
`;

  const currentCode = framework === 'pytorch' ? pytorchCode : tensorflowCode;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentCode], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pix2pix_${framework}.py`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Runnable Model Code
            </span>
            <h2 className="text-xl font-bold text-white">Production Pix2Pix Implementation</h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Complete U-Net Generator with skip connections, 70x70 PatchGAN, and alternating Min-Max Adam optimizer loop
          </p>
        </div>

        {/* Framework & Actions */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setFramework('pytorch')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                framework === 'pytorch' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              PyTorch
            </button>
            <button
              onClick={() => setFramework('tensorflow')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                framework === 'tensorflow' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              TensorFlow
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Code'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .py</span>
          </button>
        </div>
      </div>

      {/* Code Viewer Container */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <span className="text-xs text-slate-400 font-mono ml-2">
              pix2pix_{framework}.py
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">Python 3.9+ / {framework.toUpperCase()}</span>
        </div>

        <pre className="p-5 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-[600px] selection:bg-indigo-500 selection:text-white">
          <code>{currentCode}</code>
        </pre>
      </div>
    </div>
  );
};
