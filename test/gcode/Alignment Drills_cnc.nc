(G-CODE GENERATED BY FLATCAM v8.994 - www.flatcam.org - Version Date: 2020/11/7)

(Name: Alignment Drills_cnc)
(Type: G-code from Geometry)
(Units: MM)

(Created on Sunday, 22 November 2020 at 16:14)

(This preprocessor is the default preprocessor used by FlatCAM.)
(It is made to work with MACH3 compatible motion controllers.)


(TOOLS DIAMETER: )
(Tool: 1 -> Dia: 2.0)

(FEEDRATE Z: )
(Tool: 1 -> Feedrate: 300.0)

(FEEDRATE RAPIDS: )
(Tool: 1 -> Feedrate Rapids: 1500.0)

(Z_CUT: )
(Tool: 1 -> Z_Cut: -4.2)

(Tools Offset: )
(Tool: 1 -> Offset Z: 0.0)

(Z_MOVE: )
(Tool: 1 -> Z_Move: 2.0)

(Z Toolchange: 15 mm)
(X,Y Toolchange: 0.0000, 0.0000 mm)
(Z Start: None mm)
(Z End: 0.5 mm)
(X,Y End: None mm)
(Steps per circle: 64)
(Preprocessor Excellon: default)

(X range:    9.0000 ...   59.9998  mm)
(Y range:    2.0000 ...    4.0000  mm)

(Spindle Speed: 8000 RPM)
G21
G90
G94

G1 F300.00

M5
G0 Z15.0000
T1
G0 X0.0000 Y0.0000                
M6
(MSG, Change to Tool Dia = 2.0000 ||| Total drills for tool T1 = 2)
M0
G0 Z15.0000

G1 F300.00
M03 S8000
G4 P1
G0 X10.0000 Y3.0000
G1 Z-4.2000
G1 Z0
G0 Z2.0000
G0 X58.9998 Y3.0000
G1 Z-4.2000
G1 Z0
G0 Z2.0000
M05
G0 Z0.50


