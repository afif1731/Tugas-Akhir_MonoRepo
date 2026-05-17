import torch
import torch.nn as nn
import numpy as np

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

def get_adjacency_matrix():
  edges = [
    (0, 1), (0, 2), (1, 3), (2, 4),
    (5, 6), (5, 7), (7, 9), (6, 8), (8, 10),
    (11, 12), (5, 11), (6, 12),
    (11, 13), (13, 15), (12, 14), (14, 16)
  ]
  
  A = np.zeros((17, 17))
  for i, j in edges:
    A[i, j] = 1
    A[j, i] = 1
  A = A + np.eye(17)

  # Normalize
  D = np.diag(np.sum(A, axis=1) ** (-0.5))
  A_norm = np.dot(np.dot(D, A), D)
  return torch.tensor(A_norm, dtype=torch.float32).to(device)

A = get_adjacency_matrix()

class GraphConv(nn.Module):
  def __init__(self, in_channels, out_channels, num_vertices=17, adaptive=True):
    super().__init__()
    self.adaptive = adaptive

    self.conv = nn.Conv2d(in_channels, out_channels, kernel_size=1)
    self.bn = nn.BatchNorm2d(out_channels)
    self.relu = nn.ReLU()

    if self.adaptive:
      self.PA = nn.Parameter(torch.randn(num_vertices, num_vertices) * 1e-4)

    if in_channels != out_channels:
      self.down_sample = nn.Sequential(
        nn.Conv2d(in_channels, out_channels, kernel_size=1),
        nn.BatchNorm2d(out_channels)
      )
    else:
      self.down_sample = lambda x: x

  def forward(self, x, A):
    residual = self.down_sample(x)

    x = self.conv(x)

    if self.adaptive:
      A_dynamic = A + self.PA
      x = torch.einsum('nctv,vw->nctw', x, A_dynamic)
    else:
      x = torch.einsum('nctv,vw->nctw', x, A)

    x = self.bn(x)

    return self.relu(x + residual)

class TemporalAttention(nn.Module):
  def __init__(self, hidden_dim):
    super().__init__()

    self.attention = nn.Sequential(
      nn.Linear(hidden_dim, hidden_dim // 2),
      nn.Tanh(),
      nn.Linear(hidden_dim // 2, 1)
    )

  def forward(self, lstm_out):
    attn_scores = self.attention(lstm_out)
    attn_weights = torch.softmax(attn_scores, dim=1)

    context_vector = torch.sum(attn_weights * lstm_out, dim=1)
    return context_vector, attn_weights

class GCN_LSTM(nn.Module):
  def __init__(self, num_classes=5, in_channels=3, hidden_gcn=64, hidden_lstm=256, lstm_layers=2, dropout=0.5):
    super().__init__()
    self.V = 17

    self.gcn_blocks = nn.ModuleList([
      GraphConv(in_channels, hidden_gcn, self.V),
      GraphConv(hidden_gcn, hidden_gcn * 2, self.V),
      GraphConv(hidden_gcn * 2, hidden_gcn * 4, self.V)
    ])

    self.tcn = nn.Sequential(
      nn.Conv1d(hidden_gcn * 4, hidden_gcn * 4, kernel_size=3, padding=1),
      nn.BatchNorm1d(hidden_gcn * 4),
      nn.ReLU()
    )

    self.lstm = nn.LSTM(
      input_size=hidden_gcn * 4,
      hidden_size=hidden_lstm,
      num_layers=lstm_layers,
      batch_first=True,
      dropout=dropout if lstm_layers > 1 else 0.0,
      bidirectional=True
    )

    self.attn = TemporalAttention(hidden_lstm * 2)

    self.fc = nn.Sequential(
      nn.Linear(hidden_lstm * 2, hidden_lstm),
      nn.ReLU(),
      nn.Dropout(dropout),
      nn.Linear(hidden_lstm, num_classes)
    )

  def forward(self, x, A):
    N, C, T, V, M = x.size()

    x = x.permute(0, 4, 1, 2, 3).contiguous()
    x = x.view(N * M, C, T, V)

    for gcn in self.gcn_blocks:
      x = gcn(x, A)
    
    x = x.mean(dim=-1)
    x = self.tcn(x)

    x = x.permute(0, 2, 1).contiguous()
    lstm_out, _ = self.lstm(x)

    x, _ = self.attn(lstm_out)
    x = x.view(N, M, -1)
    x = torch.max(x, dim=1)[0]

    out = self.fc(x)
    return out